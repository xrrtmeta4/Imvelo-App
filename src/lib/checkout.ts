import { supabase } from '@/lib/supabase';

export interface CheckoutBody {
  product_id: string;
  product_name?: string;
  customer_email?: string;
  customer_name?: string;
  redirect_url?: string;
  cancel_url?: string;
  payment_methods?: string[];
}

/**
 * Start a Dodo checkout and return the checkout URL.
 *
 * Primary path: Supabase Edge Function `create-checkout` (works on Vercel and
 * needs DODO_PAYMENTS_API_KEY set as a Supabase secret).
 * Fallback: Express server `/api/payments/checkout` (used in local/dev or when
 * the Express server is self-hosted and has the key in server/.env).
 */
export async function startDodoCheckout(body: CheckoutBody): Promise<string> {
  try {
    const { data, error } = await supabase.functions.invoke('create-checkout', { body });
    if (!error && data?.checkout_url) {
      return data.checkout_url;
    }
    console.warn('[checkout] Edge Function unavailable:', error?.message || data?.error);
  } catch (e) {
    console.warn('[checkout] Edge Function threw:', e);
  }

  try {
    const res = await fetch('/api/payments/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_id: body.product_id,
        product_name: body.product_name || '',
        amount: 37,
        currency: 'USD',
        customer_email: body.customer_email,
        customer_name: body.customer_name,
        success_url: body.redirect_url,
        cancel_url: body.cancel_url,
      }),
    });
    const data = await res.json();
    if (res.ok && data?.checkout_url) {
      return data.checkout_url;
    }
    if (data?.error) throw new Error(data.error);
  } catch (e) {
    console.warn('[checkout] Express fallback failed:', e);
  }

  throw new Error('Payment gateway is unavailable. Please try again later.');
}
