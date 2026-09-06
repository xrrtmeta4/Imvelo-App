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
    const dodoEnvironment = (Deno.env.get('DODO_PAYMENTS_ENV') || 'live').toLowerCase();
    const isTestMode = dodoEnvironment === 'test';
    const apiBase = isTestMode ? 'https://test.dodopayments.com' : 'https://live.dodopayments.com';

    if (!apiKey) {
      const fix = 'supabase secrets set DODO_PAYMENTS_API_KEY=<your_dodo_live_key>';
      console.error('Missing DODO_PAYMENTS_API_KEY secret. Fix with:', fix);
      return new Response(
        JSON.stringify({
          error:
            'DODO_PAYMENTS_API_KEY is not set as a Supabase secret. Run: ' +
            fix,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (isTestMode) {
      console.warn('DODO_PAYMENTS_ENV is "test" but the provided key is a LIVE key; use live mode.');
    }

    let payload: Record<string, unknown>;
    try {
      const text = await req.text();
      payload = text ? (JSON.parse(text) as Record<string, unknown>) : {};
    } catch (e) {
      console.error('Invalid JSON payload', e);
      return new Response(JSON.stringify({ error: 'Invalid JSON payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { product_id, customer_email, customer_name, redirect_url, success_url, cancel_url, payment_methods, billing_address } = payload as Record<string, any>;

    if (!product_id) {
      console.error('Missing product_id in payload');
      return new Response(JSON.stringify({ error: 'product_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use globally supported payment methods by default.
    // Cards and Apple/Google Pay work in most countries.
    const defaultGlobalMethods = [
      'credit',
      'debit',
      'google_pay',
      'amazon_pay',
    ];

    const methods = (Array.isArray(payment_methods) && payment_methods.length > 0)
      ? payment_methods
      : defaultGlobalMethods;

    const body: Record<string, unknown> = {
      product_cart: [{ product_id, quantity: 1 }],
      allowed_payment_method_types: methods,
    };

    if (customer_email) {
      body.customer = { email: customer_email, name: customer_name || 'Customer' };
    }

    // Prefill the billing address and disable optional collection so the
    // hosted checkout skips the "Contact Information" step and opens straight
    // on the payment methods screen.
    body.billing_address = {
      country: (billing_address?.country as string) || 'SZ',
      city: (billing_address?.city as string) || 'Mbabane',
      state: (billing_address?.state as string) || 'Hhohho',
      street: (billing_address?.street as string) || 'N/A',
      zipcode: (billing_address?.zipcode as string) || 'H100',
    };
    body.feature_flags = {
      allow_phone_number_collection: false,
      allow_tax_id: false,
      allow_discount_code: false,
      allow_currency_selection: false,
      always_create_new_customer: false,
    };
    body.customization = { show_order_details: true };

    const returnUrl = redirect_url || success_url || cancel_url;
    if (returnUrl) body.return_url = returnUrl;
    body.metadata = { email: customer_email, name: customer_name, product_id };

    // `confirm: true` tells Dodo the customer + billing details are complete,
    // so the hosted checkout skips the Contact Information step entirely and
    // opens directly on the card / wallet payment screen.
    if (customer_email) body.confirm = true;

    console.log('Creating Dodo checkout for product:', product_id, 'methods:', methods.length, 'env:', dodoEnvironment);

    const callDodo = (payload: Record<string, unknown>) =>
      fetch(`${apiBase}/checkouts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15000),
      });

    let response = await callDodo(body);
    if (!response.ok && body.confirm) {
      // Provider rejected the pre-confirmed session — retry the normal flow.
      console.warn('[create-checkout] confirm=true rejected, retrying without it');
      const { confirm: _drop, ...fallback } = body;
      response = await callDodo(fallback);
    }


    let data: any = {};
    try {
      data = await response.json();
    } catch (jsonError) {
      console.error('[create-checkout] Failed to parse Dodo response as JSON:', jsonError);
      return new Response(JSON.stringify({ error: 'Payment gateway returned an invalid response. Please try again later.' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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
