import crypto from 'crypto';

// Thin client for the Dodo Payments REST API (the payment API provided for
// this project). All secret credentials stay server-side; the frontend never
// imports this module.

export function dodoApiBase(): string {
  const env = (process.env.DODO_PAYMENTS_ENV || 'live').toLowerCase();
  return env === 'test' ? 'https://test.dodopayments.com' : 'https://live.dodopayments.com';
}

export function dodoApiKey(): string | undefined {
  return process.env.DODO_PAYMENTS_API_KEY;
}

export function defaultPaymentMethods(): string[] {
  const fromEnv = process.env.DODO_PAYMENT_METHODS;
  if (fromEnv) {
    const methods = fromEnv.split(',').map((m) => m.trim()).filter(Boolean);
    if (methods.length > 0) return methods;
  }
  return ['credit', 'debit', 'google_pay', 'amazon_pay'];
}

export interface DodoCreateCheckoutInput {
  productId: string;
  customerEmail?: string;
  customerName?: string;
  paymentMethods: string[];
  paymentReference: string; // our internal correlation id
  plan: string;
  returnUrl?: string;
}

export interface DodoCreateCheckoutResult {
  checkoutUrl: string;
  sessionId: string;
  checkoutId: string; // Dodo's checkout/session id
}

export async function createDodoCheckout(input: DodoCreateCheckoutInput): Promise<DodoCreateCheckoutResult> {
  const apiKey = dodoApiKey();
  if (!apiKey) {
    throw new Error('Payment gateway is not configured (DODO_PAYMENTS_API_KEY).');
  }

  const body: Record<string, unknown> = {
    product_cart: [{ product_id: input.productId, quantity: 1 }],
    allowed_payment_method_types: input.paymentMethods,
    metadata: {
      email: input.customerEmail,
      name: input.customerName,
      product_id: input.productId,
      plan: input.plan,
      payment_reference: input.paymentReference,
    },
  };

  if (input.customerEmail) {
    body.customer = { email: input.customerEmail, name: input.customerName || undefined };
  }
  if (input.returnUrl) {
    body.return_url = input.returnUrl;
  }

  const response = await fetch(`${dodoApiBase()}/checkouts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });

  const data: Record<string, unknown> = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errMsg =
      (data.message as string) ||
      (data.error as string) ||
      (data.detail as string) ||
      JSON.stringify(data) ||
      `Dodo API error: ${response.status}`;
    throw new Error(errMsg);
  }

  const checkoutUrl = (data.checkout_url as string | undefined) ?? '';
  const sessionId = (data.session_id as string | undefined) ?? '';
  const checkoutId = (data.checkout_id as string | undefined) || sessionId || '';
  if (!checkoutUrl || !checkoutId) {
    throw new Error('Payment gateway did not return a checkout. Please try again.');
  }

  return { checkoutUrl, sessionId, checkoutId };
}

export type DodoCheckoutState =
  | 'pending'
  | 'succeeded'
  | 'failed'
  | 'cancelled'
  | 'expired'
  | 'unknown';

export async function getDodoCheckout(checkoutId: string): Promise<{ status: DodoCheckoutState }> {
  const apiKey = dodoApiKey();
  if (!apiKey) {
    throw new Error('Payment gateway is not configured (DODO_PAYMENTS_API_KEY).');
  }

  const response = await fetch(`${dodoApiBase()}/checkouts/${encodeURIComponent(checkoutId)}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    return { status: 'unknown' };
  }

  const data: Record<string, unknown> = await response.json().catch(() => ({}));
  const raw = String(data.status || data.state || '').toLowerCase();
  if (raw.includes('succeed') || raw === 'paid' || raw === 'completed') return { status: 'succeeded' };
  if (raw.includes('fail')) return { status: 'failed' };
  if (raw.includes('cancel')) return { status: 'cancelled' };
  if (raw.includes('expir')) return { status: 'expired' };
  if (raw.includes('pending') || raw === 'open') return { status: 'pending' };
  return { status: 'unknown' };
}

// Verify a Dodo webhook signature using HMAC-SHA256 (timing-safe).
export function verifyDodoWebhookSignature(rawBody: string, signature: string, secret: string): boolean {
  try {
    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
