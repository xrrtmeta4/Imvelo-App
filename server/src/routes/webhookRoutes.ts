import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const router = Router();
const prisma = new PrismaClient();

const PRODUCT_PLAN_MAP: Record<string, string> = {
  'pdt_0NVKhwZKeJCCaRbxoTNno': 'starter',
  'pdt_0NYZaqcOARihEXXOPIdmC': 'premium',
};

function timingSafeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

async function verifySignature(rawBody: string, signature: string, secret: string): Promise<boolean> {
  try {
    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    return timingSafeEqual(expected, signature);
  } catch {
    return false;
  }
}

// Activate premium in Supabase `premium_subscriptions` using the service-role key.
// This is the source of truth the frontend reads (useUsageLimits / Profile).
async function activatePremiumInSupabase(
  customerEmail: string,
  plan: string,
  paymentReference: string,
): Promise<boolean> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    console.warn('[webhook] SUPABASE_SERVICE_ROLE_KEY not set — skipping Supabase premium activation');
    return false;
  }

  const authHeaders = {
    Authorization: `Bearer ${serviceKey}`,
    apikey: serviceKey,
    'Content-Type': 'application/json',
  };

  // 1) Resolve the Supabase auth user by email.
  const listRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, { headers: authHeaders });
  if (!listRes.ok) {
    console.error('[webhook] Failed to list Supabase users:', listRes.status);
    return false;
  }
  const listData: any = await listRes.json();
  const user = (listData.users || []).find((u: any) => u.email === customerEmail);
  if (!user) {
    console.warn('[webhook] No Supabase user found for email:', customerEmail);
    return false;
  }

  // 2) Upsert the subscription (active, no expiry for a one-time/recurring plan).
  const existingRes = await fetch(
    `${supabaseUrl}/rest/v1/premium_subscriptions?user_id=eq.${encodeURIComponent(user.id)}&select=id`,
    { headers: authHeaders },
  );
  const existing = existingRes.ok ? await existingRes.json() : [];

  const payload = {
    user_id: user.id,
    status: 'active',
    payment_reference: paymentReference,
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
    console.error('[webhook] Failed to write premium_subscriptions:', writeRes.status, err);
    return false;
  }
  console.log('[webhook] Activated premium for user', user.id, 'plan', plan);
  return true;
}

router.post('/dodo', async (req: any, res: any) => {
  try {
    const rawBody: string = req.rawBody || JSON.stringify(req.body);
    const secret = process.env.DODO_WEBHOOK_SECRET;
    const signature = (req.headers['dodo-signature'] || req.headers['x-webhook-signature']) as string;

    if (secret) {
      if (!signature) {
        return res.status(401).json({ error: 'Missing signature' });
      }
      const valid = await verifySignature(rawBody, signature, secret);
      if (!valid) {
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    const payload = typeof req.body === 'string' ? JSON.parse(rawBody) : req.body;
    const eventType = payload.type || payload.event_type || 'unknown';

    // Persist the event for auditing (best-effort; DB may be unconfigured).
    try {
      await prisma.webhookEvent.create({
        data: {
          provider: 'dodo',
          eventType,
          providerEventId: payload.id || payload.payment_id || undefined,
          payload,
          processed: false,
        },
      });
    } catch (e) {
      console.warn('[webhook] Prisma event persistence skipped:', (e as Error).message);
    }

    const isSuccess =
      eventType === 'payment.succeeded' ||
      eventType === 'payment_intent.succeeded' ||
      eventType === 'payment.completed';

    if (isSuccess) {
      const data = payload.data || payload;
      const customerEmail =
        data.customer_email ||
        data.customer?.email ||
        data.metadata?.email ||
        data.billing_details?.email;
      const paymentReference = data.payment_id || data.id || data.payment_intent_id;
      const productId = data.product_id || data.metadata?.product_id || '';
      const plan = PRODUCT_PLAN_MAP[productId] || 'premium';

      if (customerEmail) {
        const activated = await activatePremiumInSupabase(customerEmail, plan, paymentReference || '');
        if (!activated) {
          // Fallback: record the payment in Prisma so it can be reconciled later.
          try {
            await prisma.payment.create({
              data: {
                userId: customerEmail,
                provider: 'dodo',
                providerPaymentId: paymentReference,
                amount: data.amount || 37,
                currency: data.currency || 'USD',
                status: 'succeeded',
                rawWebhook: payload,
              },
            });
          } catch (e) {
            console.warn('[webhook] Prisma payment fallback skipped:', (e as Error).message);
          }
        }
      }
    }

    // Mark processed (best-effort).
    try {
      await prisma.webhookEvent.updateMany({
        where: { provider: 'dodo', providerEventId: payload.id || payload.payment_id, processed: false },
        data: { processed: true, processedAt: new Date() },
      });
    } catch {
      /* ignore */
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/events', async (req: any, res: any) => {
  try {
    const { provider, processed, limit = '50' } = req.query;
    const events = await prisma.webhookEvent.findMany({
      where: {
        ...(provider && { provider: provider as string }),
        ...(processed !== undefined && { processed: processed === 'true' }),
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
    });
    res.json(events);
  } catch (error) {
    console.error('Get webhook events error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
