import { Router } from 'express';
import { z } from 'zod';
import { createPayment, getPaymentStatus } from '../payment/paymentService.js';

const router = Router();

const checkoutSchema = z.object({
  product_id: z.string().min(1),
  customer_email: z.string().email().optional(),
  customer_name: z.string().optional(),
  payment_methods: z.array(z.string()).optional(),
  return_url: z.string().url().optional(),
});

router.post('/checkout', async (req: any, res: any) => {
  try {
    const input = checkoutSchema.parse(req.body);

    if (!process.env.DODO_PAYMENTS_API_KEY) {
      return res.status(500).json({ error: 'Payment gateway is not configured.' });
    }

    const result = await createPayment({
      productId: input.product_id,
      customerEmail: input.customer_email,
      customerName: input.customer_name,
      paymentMethods: input.payment_methods,
      returnUrl: input.return_url,
    });

    res.status(200).json({
      id: result.paymentId,
      payment_id: result.paymentReference,
      checkout_url: result.checkoutUrl,
      session_id: result.sessionId,
      amount: result.amount,
      currency: result.currency,
      plan: result.plan,
      status: result.status,
    });
  } catch (error) {
    console.error('Checkout error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: error.flatten() });
    }
    res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid request' });
  }
});

// Authoritative status lookup (server-side). Used by the client to poll.
router.get('/:id/status', async (req: any, res: any) => {
  try {
    const status = await getPaymentStatus(req.params.id);
    if (!status) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    res.json(status);
  } catch (error) {
    console.error('Get payment status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req: any, res: any) => {
  try {
      const { prisma } = await import('../db.js');
    const payment = await prisma.payment.findUnique({
      where: { id: req.params.id },
      include: { user: true },
    });
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    res.json(payment);
  } catch (error) {
    console.error('Get payment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
