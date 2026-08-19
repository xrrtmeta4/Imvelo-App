import type { VercelRequest, VercelResponse } from '@vercel/node';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-webhook-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

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
      res.status(500).json({ error: 'Payment gateway is not configured. Set DODO_PAYMENTS_API_KEY.' });
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
    } = (req.body || {}) as Record<string, unknown>;

    if (!product_id) {
      res.status(400).json({ error: 'product_id is required' });
      return;
    }

    const defaultMethods = ['credit', 'debit', 'google_pay', 'amazon_pay'];
    const methods =
      Array.isArray(payment_methods) && payment_methods.length > 0
        ? (payment_methods as string[])
        : defaultMethods;

    const body: Record<string, unknown> = {
      product_cart: [{ product_id, quantity: 1 }],
      allowed_payment_method_types: methods,
    };

    if (customer_email) body.customer = { email: customer_email, name: customer_name || undefined };
    const returnUrl = return_url || redirect_url || success_url || cancel_url;
    if (returnUrl) body.return_url = returnUrl;
    body.metadata = { email: customer_email, name: customer_name, product_id };

    const response = await fetch(`${apiBase}/checkouts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
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

    res.status(200).json({
      checkout_url: (data.checkout_url as string | undefined) ?? undefined,
      session_id: (data.session_id as string | undefined) ?? undefined,
    });
  } catch (error: unknown) {
    console.error('Checkout server error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown server error' });
  }
}
