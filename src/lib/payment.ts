// Frontend payment client.
//
// Talks ONLY to our own backend (Vercel serverless function in production, or
// the self-hosted Express server in dev). It never calls Dodo directly and
// never receives secret credentials. The backend is responsible for creating
// the Dodo checkout; the client only opens the in-app overlay and polls the
// backend for the authoritative payment status.

export interface CreatePaymentInput {
  productId: string;
  customerEmail: string;
  customerName?: string;
  paymentMethods?: string[];
  returnUrl?: string;
}

export interface CreatePaymentResult {
  paymentId: string;
  checkoutUrl: string;
  sessionId: string;
  amount?: number;
  currency?: string;
  plan?: string;
}

export interface PaymentStatus {
  id: string;
  status: string;
  amount?: number;
  currency?: string;
  plan?: string;
  paidAt?: string | null;
  failureReason?: string | null;
}

const REQUEST_TIMEOUT_MS = 15000;

const fetchWithTimeout = (url: string, opts: RequestInit, ms = REQUEST_TIMEOUT_MS): Promise<Response> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return fetch(url, { ...opts, signal: controller.signal }).finally(() => clearTimeout(timer));
};

// Normalize the different backend response shapes into CreatePaymentResult.
function toResult(data: any): CreatePaymentResult {
  return {
    paymentId: data.payment_id || data.id,
    checkoutUrl: data.checkout_url || data.checkoutUrl,
    sessionId: data.session_id || data.sessionId,
    amount: data.amount,
    currency: data.currency,
    plan: data.plan,
  };
}

export async function createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
  const body = {
    product_id: input.productId,
    customer_email: input.customerEmail,
    customer_name: input.customerName,
    payment_methods: input.paymentMethods,
    return_url: input.returnUrl,
  };

  const opts: RequestInit = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };

  // 1) Vercel serverless function (production path).
  try {
    const res = await fetchWithTimeout('/api/create-checkout', opts);
    let data: any = {};
    try {
      data = await res.json();
    } catch {
      /* ignore non-JSON */
    }
    if (res.ok && data?.checkout_url) {
      return toResult(data);
    }
    if (!res.ok && res.status < 500 && data?.error) {
      throw new Error(data.error);
    }
    console.warn('[payment] /api/create-checkout unavailable:', res.status, data?.error);
  } catch (e) {
    console.warn('[payment] /api/create-checkout threw:', e);
  }

  // 2) Express backend (local dev / self-hosted).
  try {
    const res = await fetchWithTimeout('/api/payments/checkout', opts);
    let data: any = {};
    try {
      data = await res.json();
    } catch {
      /* ignore non-JSON */
    }
    if (res.ok && data?.checkout_url) {
      return toResult(data);
    }
    if (data?.error) throw new Error(data.error);
  } catch (e) {
    console.warn('[payment] Express checkout failed:', e);
  }

  throw new Error('Payment gateway is unavailable. Please try again later.');
}

// Poll the backend for the authoritative payment status. Resolves with the
// latest status, or null if the backend does not support status lookup.
export async function getPaymentStatus(paymentId: string): Promise<PaymentStatus | null> {
  try {
    const res = await fetchWithTimeout(`/api/payments/${encodeURIComponent(paymentId)}/status`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) return null;
    return (await res.json()) as PaymentStatus;
  } catch {
    return null;
  }
}
