export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'successful'
  | 'failed'
  | 'cancelled'
  | 'refunded'
  | 'expired';

export interface CreatePaymentInput {
  productId: string;
  customerEmail?: string;
  customerName?: string;
  paymentMethods?: string[];
  userId?: string;
  returnUrl?: string;
}

export interface CreatePaymentResult {
  paymentId: string; // internal DB id (cuid)
  providerPaymentId: string; // Dodo checkout/session id
  paymentReference: string; // internal correlation reference (pay_...)
  checkoutUrl: string;
  sessionId: string;
  amount: number;
  currency: string;
  plan: string;
  status: PaymentStatus;
}

export interface PaymentStatusResult {
  id: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  plan?: string | null;
  paidAt: string | null;
  failureReason: string | null;
}
