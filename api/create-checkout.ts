import type { VercelRequest, VercelResponse } from '@vercel/node';

// Self-contained product catalog (the Vercel function must not depend on files
// outside `api/` — keep this in sync with src/lib/products.ts and
// server/src/payment/products.ts). The backend is authoritative for prices.
const PRODUCT_CATALOG: Record<string, { plan: string; price: number; currency: string }> = {
  pdt_0NYZaqcOARihEXXOPIdmC: { plan: 'premium', price: 37, currency: 'USD' },
  pdt_0NVKhwZKeJCCaRbxoTNno: { plan: 'commercial', price: 499, currency: 'USD' },
  pdt_0NYZb3ccdGubedVQypzZn: { plan: 'enterprise', price: 999, currency: 'USD' },
};

const PRODUCT_PLAN_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(PRODUCT_CATALOG).map(([id, v]) => [id, v.plan]),
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-webhook-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function newPaymentReference(): string {
  const uuid =
    (globalThis as any).crypto?.randomUUID?.() ||
    `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `pay_${uuid}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json({});
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const apiKey = process.env.DODO_PAYMENTS_API_KEY;
    const dodoEnv = (process.env.DODO_PAYMENTS_ENV || 'live').toLowerCase();
    const isTestMode = dodoEnv === 'test';
    const apiBase = isTestMode ? 'https://test.dodopayments.com' : 'https://live.dodopayments.com';

    if (!apiKey) {
      console.error('Missing DODO_PAYMENTS_API_KEY env var');
      res.status(500).json({ error: 'Payment gateway is not configured (DODO_PAYMENTS_API_KEY).' });
      return;
    }

    if (isTestMode) {
      console.warn('DODO_PAYMENTS_ENV=test');
    }

    const {
      product_id,
      customer_email,
      customer_name,
      success_url,
      cancel_url,
      redirect_url,
      payment_methods,
      return_url,
      billing_address,
    } = (req.body || {}) as Record<string, unknown>;

    // The backend is the authority on which products are valid and how much
    // they cost. Never trust an amount sent from the client.
    if (!product_id || !PRODUCT_CATALOG[product_id as string]) {
      res.status(400).json({ error: 'Unknown or missing product_id.' });
      return;
    }

    const product = PRODUCT_CATALOG[product_id as string];
    const paymentReference = newPaymentReference();

    const defaultMethods = ['credit', 'debit', 'google_pay', 'amazon_pay'];
    const methods =
      Array.isArray(payment_methods) && payment_methods.length > 0
        ? (payment_methods as string[])
        : defaultMethods;

    // The return URL is where Dodo sends the user after the (in-app) checkout
    // completes. It must NOT contain any "success" flag — activation is driven
    // exclusively by the verified webhook, never by the redirect target.
    const returnUrl =
      (return_url || redirect_url || success_url || cancel_url || `${req.headers.origin || ''}/upgrade`) as string;

    const body: Record<string, unknown> = {
      product_cart: [{ product_id, quantity: 1 }],
      allowed_payment_method_types: methods,
      metadata: {
        email: customer_email,
        name: customer_name,
        product_id,
        plan: PRODUCT_PLAN_MAP[product_id as string] || product.plan,
        payment_reference: paymentReference,
      },
    };

    if (customer_email) body.customer = { email: customer_email, name: (customer_name as string) || 'Customer' };

    // Prefilled billing details + disabled optional fields so the checkout
    // opens directly on the payment screen (no contact information step).
    const addr = (billing_address || {}) as Record<string, string>;
    body.billing_address = {
      country: addr.country || 'SZ',
      city: addr.city || 'Mbabane',
      state: addr.state || 'Hhohho',
      street: addr.street || 'N/A',
      zipcode: addr.zipcode || 'H100',
    };
    body.feature_flags = {
      allow_phone_number_collection: false,
      allow_tax_id: false,
      allow_discount_code: false,
      allow_currency_selection: false,
      always_create_new_customer: false,
    };
    body.customization = { show_order_details: true };
    if (returnUrl) body.return_url = returnUrl;

    const response = await fetch(`${apiBase}/checkouts`, {
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
      console.error('Dodo API error:', errMsg);
      res.status(response.status >= 400 && response.status < 500 ? response.status : 502).json({ error: errMsg });
      return;
    }

    for (const [k, v] of Object.entries(corsHeaders)) {
      res.setHeader(k, v as string);
    }

    // Return the internal payment reference alongside Dodo's checkout info so
    // the client can poll status and the webhook can reconcile the event.
    res.status(200).json({
      payment_id: paymentReference,
      checkout_url: (data.checkout_url as string | undefined) ?? undefined,
      session_id: (data.session_id as string | undefined) ?? undefined,
      amount: product.price,
      currency: product.currency,
      plan: product.plan,
    });
  } catch (error: unknown) {
    console.error('Checkout server error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown server error' });
  }
}
