export interface DodoCheckoutParams {
  productId: string;
  productName: string;
  amount: number;
  currency: string;
  customerEmail: string;
  customerName?: string;
  paymentMethods?: string[];
  successUrl?: string;
  cancelUrl?: string;
  metadata?: Record<string, any>;
}

export interface DodoCheckoutResult {
  checkoutUrl: string;
  sessionId: string;
}

export async function createDodoCheckout(params: DodoCheckoutParams): Promise<DodoCheckoutResult> {
  const {
    productId,
    productName,
    amount,
    currency,
    customerEmail,
    customerName,
    paymentMethods = ['credit', 'debit', 'apple_pay', 'google_pay'],
    successUrl,
    cancelUrl,
    metadata,
  } = params;

  const response = await fetch('/api/payments/checkout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      product_id: productId,
      product_name: productName,
      amount,
      currency,
      customer_email: customerEmail,
      customer_name: customerName,
      payment_methods: paymentMethods,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata,
    }),
  });

  let data: any = {};
  try {
    data = await response.json();
  } catch {
    // ignore non-JSON responses
  }

  if (!response.ok || !data?.checkout_url) {
    throw new Error(data?.error || 'Failed to create checkout session');
  }

  return {
    checkoutUrl: data.checkout_url,
    sessionId: data.session_id || data.id,
  };
}

export async function openDodoCheckout(params: DodoCheckoutParams): Promise<void> {
  const { checkoutUrl } = await createDodoCheckout(params);

  const { openDodoOverlay } = await import('@/lib/dodoCheckout');
  await openDodoOverlay(checkoutUrl);
}
