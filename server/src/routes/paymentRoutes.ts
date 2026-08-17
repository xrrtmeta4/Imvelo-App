import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { createCheckoutSchema } from '../schemas';

export const paymentRoutes = async (app: any) => {
  const prisma = new PrismaClient();

  app.post('/checkout', async (req: any, res: any) => {
    try {
      const input = createCheckoutSchema.parse(req.body);
      const { product_id, product_name, amount, currency, customer_email, customer_name, payment_methods, success_url, cancel_url, metadata } = input;

      const payment = await prisma.payment.create({
        data: {
          userId: customer_email || 'guest',
          provider: 'dodo',
          amount,
          currency,
          status: 'pending',
          paymentMethod: payment_methods?.join(','),
          metadata,
        },
      });

      const checkoutUrl = `https://checkout.dodopayments.com/buy/${product_id}?quantity=1${success_url ? `&success_url=${encodeURIComponent(success_url)}` : ''}${cancel_url ? `&cancel_url=${encodeURIComponent(cancel_url)}` : ''}`;

      res.status(200).json({
        id: payment.id,
        checkout_url: checkoutUrl,
        amount,
        currency,
        status: payment.status,
      });
    } catch (error) {
      console.error('Checkout error:', error);
      res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid request' });
    }
  });

  app.get('/:id', async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const payment = await prisma.payment.findUnique({
        where: { id },
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
};

export default paymentRoutes;
