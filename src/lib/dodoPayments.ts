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
    paymentMethods,
    successUrl,
    cancelUrl,
    metadata,
  } = params;

  const body: Record<string, any> = {
    product_id: productId,
    product_name: productName,
    amount,
    currency,
    customer_email: customerEmail,
    customer_name: customerName,
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata,
  };

  if (paymentMethods && paymentMethods.length > 0) {
    body.payment_methods = paymentMethods;
  }

  let response: Response;
  try {
    response = await fetch('/api/payments/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.error('[dodoPayments] Checkout network error:', err);
    throw new Error('Payment gateway is unreachable. Make sure the backend server is running and try again.');
  }

  let data: any = {};
  try {
    data = await response.json();
  } catch {
    // ignore non-JSON responses
  }

  if (!response.ok) {
    const detail = data?.error || data?.message || data?.detail || `Server error ${response.status}`;
    throw new Error(`Payment setup failed: ${detail}`);
  }

  if (!data?.checkout_url) {
    throw new Error(data?.error || 'Payment gateway did not return a checkout link.');
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
