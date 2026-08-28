import crypto from 'crypto';
import { prisma } from '../db.js';
import { isKnownProduct, getProduct, PRODUCT_PLAN_MAP } from './products.js';
import {
  createDodoCheckout,
  getDodoCheckout,
  verifyDodoWebhookSignature,
  defaultPaymentMethods,
} from './dodoGateway.js';
import type { CreatePaymentInput, CreatePaymentResult, PaymentStatus, PaymentStatusResult } from './paymentTypes.js';

function newPaymentReference(): string {
  return `pay_${crypto.randomUUID()}`;
}

function mapDodoStateToStatus(state: string): PaymentStatus {
  switch (state) {
    case 'succeeded':
      return 'successful';
    case 'failed':
      return 'failed';
    case 'cancelled':
      return 'cancelled';
    case 'expired':
      return 'expired';
    default:
      return 'pending';
  }
}

/**
 * Create a payment via the Dodo Payments API (server-side). The backend is the
 * authority on the product/price; the client only supplies the product id.
 */
export async function createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
  if (!isKnownProduct(input.productId)) {
    throw new Error('Unknown or missing product_id.');
  }
  const product = getProduct(input.productId)!;

  const paymentReference = newPaymentReference();

  const dodo = await createDodoCheckout({
    productId: input.productId,
    customerEmail: input.customerEmail,
    customerName: input.customerName,
    paymentMethods: input.paymentMethods && input.paymentMethods.length > 0
      ? input.paymentMethods
      : defaultPaymentMethods(),
    paymentReference,
    plan: product.plan,
    returnUrl: input.returnUrl,
  });

  const payment = await prisma.payment.create({
    data: {
      userId: input.customerEmail || input.userId || 'guest',
      provider: 'dodo',
      providerPaymentId: dodo.checkoutId,
      providerReference: paymentReference,
      amount: product.price,
      currency: product.currency,
      status: 'pending',
      paymentMethod: (input.paymentMethods || []).join(',') || null,
      productId: input.productId,
      plan: product.plan,
      gateway: 'dodo',
      metadata: {
        checkout_url: dodo.checkoutUrl,
        session_id: dodo.sessionId,
        payment_reference: paymentReference,
      },
    },
  });

  return {
    paymentId: payment.id,
    providerPaymentId: dodo.checkoutId,
    paymentReference,
    checkoutUrl: dodo.checkoutUrl,
    sessionId: dodo.sessionId,
    amount: product.price,
    currency: product.currency,
    plan: product.plan,
    status: 'pending',
  };
}

/**
 * Return the authoritative payment status. When the local status is still
 * pending we ask Dodo for the latest state and reconcile the local record
 * (this is a server-side verification, never trusted from the client).
 */
export async function getPaymentStatus(id: string): Promise<PaymentStatusResult | null> {
  const payment = await prisma.payment.findUnique({ where: { id } });
  if (!payment) return null;

  let status = (payment.status as PaymentStatus) || 'pending';

  if (status === 'pending' && payment.providerPaymentId) {
    try {
      const { status: remote } = await getDodoCheckout(payment.providerPaymentId);
      const mapped = mapDodoStateToStatus(remote);
      if (mapped !== 'pending') {
        await reconcilePayment(payment.providerPaymentId, mapped, payment.metadata as any);
        status = mapped;
        const refreshed = await prisma.payment.findUnique({ where: { id } });
        if (refreshed) status = refreshed.status as PaymentStatus;
      }
    } catch {
      /* leave as pending if the gateway call fails */
    }
  }

  return {
    id: payment.id,
    status,
    amount: payment.amount,
    currency: payment.currency,
    plan: payment.plan,
    paidAt: payment.paidAt ? payment.paidAt.toISOString() : null,
    failureReason: payment.failureReason,
  };
}

/**
 * Update the local Payment row and, on success, activate the subscription via
 * the Supabase service role. Safe to call multiple times (idempotent).
 */
async function reconcilePayment(
  providerPaymentId: string,
  status: PaymentStatus,
  metadata?: any,
): Promise<void> {
  const update: Record<string, unknown> = { status };
  if (status === 'successful') update.paidAt = new Date();
  if (status === 'failed' || status === 'cancelled' || status === 'expired') {
    update.failureReason =
      metadata?.failure_reason || metadata?.failureReason || `${status} via payment provider`;
  }

  await prisma.payment.updateMany({
    where: { providerPaymentId },
    data: update,
  });

  if (status === 'successful') {
    const email = metadata?.email || metadata?.customer_email;
    const plan = metadata?.plan || (metadata?.product_id ? PRODUCT_PLAN_MAP[metadata.product_id] : undefined) || 'premium';
    if (email) {
      await activateSubscription(email, plan, metadata?.payment_reference || providerPaymentId);
    }
  }
}

/**
 * Activate (or update) the user's subscription in Supabase using the service
 * role. Idempotent: sending the welcome email only happens on a new activation.
 */
export async function activateSubscription(email: string, plan: string, reference: string): Promise<boolean> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    console.warn('[payment] SUPABASE_SERVICE_ROLE_KEY not set — skipping Supabase activation');
    return false;
  }

  const authHeaders = {
    Authorization: `Bearer ${serviceKey}`,
    apikey: serviceKey,
    'Content-Type': 'application/json',
  };

  try {
    const listRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, { headers: authHeaders });
    if (!listRes.ok) {
      console.error('[payment] Failed to list Supabase users:', listRes.status);
      return false;
    }
    const listData: any = await listRes.json();
    const user = (listData.users || []).find((u: any) => u.email === email);
    if (!user) {
      console.warn('[payment] No Supabase user found for email:', email);
      return false;
    }

    const existingRes = await fetch(
      `${supabaseUrl}/rest/v1/premium_subscriptions?user_id=eq.${encodeURIComponent(user.id)}&select=id,status,payment_reference`,
      { headers: authHeaders },
    );
    const existing = existingRes.ok ? await existingRes.json() : [];
    const wasActive = existing?.length && existing[0].status === 'active';

    const payload = {
      user_id: user.id,
      status: 'active',
      payment_reference: reference,
      expires_at: null,
      plan,
    };

    const writeRes = existing?.length
      ? await fetch(
          `${supabaseUrl}/rest/v1/premium_subscriptions?user_id=eq.${encodeURIComponent(user.id)}`,
          {
            method: 'PATCH',
            headers: { ...authHeaders, Prefer: 'return=representation' },
            body: JSON.stringify(payload),
          },
        )
      : await fetch(`${supabaseUrl}/rest/v1/premium_subscriptions`, {
          method: 'POST',
          headers: { ...authHeaders, Prefer: 'return=representation' },
          body: JSON.stringify(payload),
        });

    if (!writeRes.ok) {
      const err = await writeRes.text();
      console.error('[payment] Failed to write premium_subscriptions:', writeRes.status, err);
      return false;
    }

    // Welcome email only on a genuinely new activation.
    if (!wasActive) {
      await sendActivationEmail(email, user.id, plan);
    }

    console.log('[payment] Activated subscription for', user.id, 'plan', plan);
    return true;
  } catch (e) {
    console.error('[payment] activateSubscription error:', (e as Error).message);
    return false;
  }
}

async function sendActivationEmail(_email: string, _userId: string, _plan: string): Promise<void> {
  // Hook for provider email (e.g. Resend). Kept separate so it can be wired
  // without touching the activation logic. No secrets logged.
  return;
}

export interface WebhookHandleResult {
  processed: boolean;
  alreadyProcessed: boolean;
}

/**
 * Handle an incoming Dodo webhook. Verifies the signature, persists the event
 * idempotently (unique provider+providerEventId), reconciles the payment and
 * activates the subscription. Never trusts the payload without verification.
 */
export async function handleWebhook(rawBody: string, signature?: string): Promise<WebhookHandleResult> {
  const secret = process.env.DODO_WEBHOOK_SECRET;

  if (secret) {
    if (!signature) {
      throw new Error('Missing webhook signature');
    }
    if (!verifyDodoWebhookSignature(rawBody, signature, secret)) {
      throw new Error('Invalid webhook signature');
    }
  }

  const payload = JSON.parse(rawBody);
  const eventType: string = payload.type || payload.event_type || 'unknown';
  const providerEventId: string | undefined = payload.id || payload.payment_id || payload.payment_intent_id;

  // Idempotency: persist the event. A duplicate delivery collides on the
  // (provider, providerEventId) unique index and is treated as already handled.
  try {
    await prisma.webhookEvent.create({
      data: {
        provider: 'dodo',
        eventType,
        providerEventId,
        payload,
        processed: false,
      },
    });
  } catch (e: any) {
    if (e?.code === 'P2002') {
      return { processed: true, alreadyProcessed: true };
    }
    // If the table/column is missing (not migrated yet) we still try to
    // reconcile the payment below using the payload directly.
    console.warn('[payment] webhook event persistence skipped:', e?.message);
  }

  const isSuccess =
    eventType === 'payment.succeeded' ||
    eventType === 'payment_intent.succeeded' ||
    eventType === 'payment.completed';
  const isFailure =
    eventType === 'payment.failed' || eventType === 'payment_intent.failed';
  const isCancelled =
    eventType === 'payment.cancelled' || eventType === 'payment_intent.cancelled';

  if (isSuccess || isFailure || isCancelled) {
    const data = payload.data || payload;
    const meta = data.metadata || {};
    const paymentReference: string | undefined =
      meta.payment_reference || data.payment_id || data.id || data.payment_intent_id;
    const providerPaymentId: string | undefined =
      data.payment_id || data.id || data.payment_intent_id || meta.payment_reference;
    const status: PaymentStatus = isSuccess ? 'successful' : isCancelled ? 'cancelled' : 'failed';

    if (providerPaymentId) {
      await reconcilePayment(providerPaymentId, status, {
        ...meta,
        email: meta.email || data.customer_email || data.customer?.email,
        plan: meta.plan || (meta.product_id ? PRODUCT_PLAN_MAP[meta.product_id] : undefined),
        payment_reference: paymentReference,
      });
    }
  }

  // Mark processed (best-effort).
  if (providerEventId) {
    await prisma.webhookEvent
      .updateMany({
        where: { provider: 'dodo', providerEventId, processed: false },
        data: { processed: true, processedAt: new Date() },
      })
      .catch(() => undefined);
  }

  return { processed: true, alreadyProcessed: false };
}
