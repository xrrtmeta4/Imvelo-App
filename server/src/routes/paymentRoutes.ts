import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { createCheckoutSchema } from '../schemas';

export const paymentRoutes = async (app: any) => {
  const prisma = new PrismaClient();

  app.post('/checkout', async (req: any, res: any) => {
    try {
      const input = createCheckoutSchema.parse(req.body);
      const { product_id, product_name, amount, currency, customer_email, customer_name, payment_methods, success_url, cancel_url, metadata } = input;

      const apiKey = process.env.DODO_PAYMENTS_API_KEY;
      const dodoEnv = (process.env.DODO_PAYMENTS_ENV || 'live').toLowerCase();
      const isTestMode = dodoEnv === 'test';
      const apiBase = isTestMode ? 'https://test.dodopayments.com' : 'https://live.dodopayments.com';

      if (!apiKey) {
        return res.status(500).json({ error: 'Dodo Payments API key not configured' });
      }

      const defaultMethods = [
        'credit', 'debit', 'apple_pay', 'google_pay', 'amazon_pay',
        'cashapp', 'klarna', 'afterpay_clearpay', 'sepa', 'pix',
        'crypto_currency', 'we_chat_pay', 'upi_collect', 'ideal',
        'bancontact_card', 'eps', 'multibanco', 'blik', 'revolut_pay',
        'billie', 'satispay'
      ];

      const methods = (Array.isArray(payment_methods) && payment_methods.length > 0)
        ? payment_methods
        : defaultMethods;

      const dodoBody: Record<string, unknown> = {
        product_cart: [{ product_id, quantity: 1 }],
        allowed_payment_method_types: methods,
      };

      if (customer_email) {
        dodoBody.customer = { email: customer_email, name: customer_name || undefined };
      }
      if (success_url || cancel_url) {
        dodoBody.return_url = success_url || cancel_url;
      }
      if (metadata) {
        dodoBody.metadata = metadata;
      }

      const dodoResponse = await fetch(`${apiBase}/checkouts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dodoBody),
      });

      const dodoData = await dodoResponse.json();

      if (!dodoResponse.ok) {
        const errMsg = dodoData.message || dodoData.error || dodoData.detail || JSON.stringify(dodoData) || `Dodo API error: ${dodoResponse.status}`;
        return res.status(dodoResponse.status >= 400 && dodoResponse.status < 500 ? dodoResponse.status : 502).json({ error: errMsg });
      }

      const payment = await prisma.payment.create({
        data: {
          userId: customer_email || 'guest',
          provider: 'dodo',
          amount,
          currency,
          status: 'pending',
          paymentMethod: methods.join(','),
          providerPaymentId: dodoData.session_id || dodoData.id,
          metadata,
        },
      });

      res.status(200).json({
        id: payment.id,
        checkout_url: dodoData.checkout_url,
        session_id: dodoData.session_id,
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
