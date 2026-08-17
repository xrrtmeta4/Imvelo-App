import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('DODO_PAYMENTS_API_KEY');
    const dodoEnvironment = (Deno.env.get('DODO_ENVIRONMENT') || 'live_mode').toLowerCase();
    const isTestMode = dodoEnvironment === 'test_mode';
    const apiBase = isTestMode ? 'https://test.dodopayments.com' : 'https://live.dodopayments.com';

    if (!apiKey) {
      console.error('Missing DODO_PAYMENTS_API_KEY secret');
      return new Response(JSON.stringify({ error: 'DODO_PAYMENTS_API_KEY not configured on server' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let payload: Record<string, unknown>;
    try {
      payload = await req.json();
    } catch (e) {
      console.error('Invalid JSON payload', e);
      return new Response(JSON.stringify({ error: 'Invalid JSON payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { product_id, customer_email, customer_name, redirect_url, payment_methods } = payload;

    if (!product_id) {
      console.error('Missing product_id in payload');
      return new Response(JSON.stringify({ error: 'product_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // All payment methods supported by Dodo Payments (complete list from API docs)
    const allPaymentMethods = [
      'credit', 'debit',
      'apple_pay', 'google_pay', 'amazon_pay', 'samsung_pay',
      'cashapp', 'venmo', 'paypal', 'paze',
      'klarna', 'affirm', 'afterpay_clearpay', 'alma', 'atome', 'billie', 'zip',
      'ali_pay', 'ali_pay_hk', 'we_chat_pay', 'dana', 'gcash', 'kakao_pay', 'touch_n_go', 'momo', 'go_pay', 'naver_pay',
      'ach', 'multibanco', 'eps', 'bancontact_card', 'blik', 'giropay', 'ideal', 'przelewy24', 'sofort', 'sepa',
      'online_banking_fpx', 'online_banking_thailand', 'online_banking_czech_republic', 'online_banking_finland',
      'online_banking_poland', 'online_banking_slovakia',
      'boleto', 'oxxo', 'pix', 'prompt_pay', 'swish', 'trustly', 'vipps', 'mb_way',
      'revolut_pay', 'open_banking_uk',
      'crypto_currency',
      'satispay', 'payco',
    ];

    const methods = (Array.isArray(payment_methods) && payment_methods.length > 0)
      ? payment_methods
      : allPaymentMethods;

    const body: Record<string, unknown> = {
      product_cart: [{ product_id, quantity: 1 }],
      allowed_payment_method_types: methods,
    };

    if (customer_email) body.customer = { email: customer_email, name: customer_name || undefined };
    if (redirect_url) body.return_url = redirect_url;

    console.log('Creating Dodo checkout for product:', product_id, 'methods:', methods.length, 'env:', dodoEnvironment);

    const response = await fetch(`${apiBase}/checkouts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    console.log('Dodo response status:', response.status, 'data:', JSON.stringify(data).slice(0, 500));

    if (!response.ok) {
      const errMsg = data.message || data.error || data.detail || JSON.stringify(data) || `API error: ${response.status}`;
      console.error('Dodo API error:', errMsg);
      return new Response(JSON.stringify({ error: errMsg }), {
        status: response.status >= 400 && response.status < 500 ? response.status : 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      checkout_url: data.checkout_url,
      session_id: data.session_id,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Checkout server error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown server error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
