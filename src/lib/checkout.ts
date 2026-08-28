import { supabase } from '@/lib/supabase';

export interface CheckoutBody {
  product_id: string;
  product_name?: string;
  customer_email?: string;
  customer_name?: string;
  redirect_url?: string;
  cancel_url?: string;
  payment_methods?: string[];
  success_url?: string;
}

interface CheckoutResponse {
  checkout_url?: string;
  session_id?: string;
  error?: string;
}

// Browser `fetch` has no default timeout. A stalled payment gateway (e.g. Dodo
// hanging on an unknown product) would leave `loading` spinning forever, which
// is exactly the "loading non-stop" bug. Bound every request.
const REQUEST_TIMEOUT_MS = 15000;

const fetchWithTimeout = (url: string, opts: RequestInit, ms = REQUEST_TIMEOUT_MS): Promise<Response> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return fetch(url, { ...opts, signal: controller.signal }).finally(() => clearTimeout(timer));
};

const POST_OPTIONS = (body: CheckoutBody) => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    product_id: body.product_id,
    product_name: body.product_name || '',
    customer_email: body.customer_email,
    customer_name: body.customer_name,
    success_url: body.redirect_url || body.success_url,
    cancel_url: body.cancel_url,
    return_url: body.redirect_url || body.success_url,
  }),
});

/**
 * Start a Dodo checkout and return the checkout URL.
 *
 * Primary path: Vercel serverless function `/api/create-checkout`, which reads
 * DODO_PAYMENTS_API_KEY from the deployment environment (Vercel env vars).
 * Fallbacks: Supabase Edge Function `create-checkout`, then a self-hosted
 * Express server at `/api/payments/checkout`.
 */
export async function startDodoCheckout(body: CheckoutBody): Promise<string> {
  const opts = POST_OPTIONS(body);

  // 1) Vercel serverless function (uses Vercel env vars)
  try {
    const res = await fetchWithTimeout('/api/create-checkout', opts);
    let data: CheckoutResponse = {};
    try {
      data = await res.json();
    } catch {
      /* ignore */
    }
    if (res.ok && data.checkout_url) {
      return data.checkout_url;
    }
    if (!res.ok && res.status < 500 && data?.error) {
      throw new Error(data.error);
    }
    console.warn('[checkout] /api/create-checkout unavailable:', res.status, data?.error);
  } catch (e) {
    console.warn('[checkout] /api/create-checkout threw:', e);
  }

  // 2) Supabase Edge Function (bounded so a stalled gateway can't hang forever)
  try {
    const timedInvoke = await Promise.race([
      supabase.functions.invoke('create-checkout', { body }),
      new Promise<{ data: { checkout_url?: string; error?: string } | null; error: { message?: string } | null }>(
        (_, reject) => setTimeout(() => reject(new Error('Checkout request timed out')), REQUEST_TIMEOUT_MS),
      ),
    ]);
    const { data, error } = timedInvoke;
    if (!error && data?.checkout_url) {
      return data.checkout_url;
    }
    console.warn('[checkout] Edge Function unavailable:', error?.message || (data as { error?: string } | null)?.error);
  } catch (e) {
    console.warn('[checkout] Edge Function threw:', e);
  }

  // 3) Express fallback (self-hosted / local dev)
  try {
    const res = await fetchWithTimeout('/api/payments/checkout', opts);
    let data: CheckoutResponse = {};
    try {
      data = await res.json();
    } catch {
      /* ignore */
    }
    if (res.ok && data.checkout_url) {
      return data.checkout_url;
    }
    if (data?.error) throw new Error(data.error);
  } catch (e) {
    console.warn('[checkout] Express fallback failed:', e);
  }

  throw new Error('Payment gateway is unavailable. Please try again later.');
}
