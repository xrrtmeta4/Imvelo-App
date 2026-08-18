import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { webhookSchema } from '../schemas';

const router = Router();
const prisma = new PrismaClient();

router.post('/dodo', async (req: any, res: any) => {
  try {
    const signature = req.headers['x-webhook-signature'] as string;
    const secret = process.env.DODO_WEBHOOK_SECRET;

    if (!secret || !signature) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const payload = req.body;
    const eventType = payload.event_type || payload.type || 'unknown';

    await prisma.webhookEvent.create({
      data: {
        provider: 'dodo',
        eventType,
        providerEventId: payload.id || payload.payment_id || undefined,
        payload,
        processed: false,
      },
    });

    if (eventType === 'payment.succeeded' || eventType === 'payment_intent.succeeded') {
      const customerEmail = payload.customer_email || payload.data?.customer?.email;
      const paymentReference = payload.payment_reference || payload.id;
      const productId = payload.product_id;

      if (customerEmail) {
        const user = await prisma.user.findUnique({
          where: { email: customerEmail },
        });

        if (user) {
          await prisma.subscription.upsert({
            where: { id: `${user.id}-premium` },
            update: {
              plan: 'premium',
              status: 'active',
              paymentProvider: 'dodo',
              paymentId: paymentReference,
              currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
            create: {
              userId: user.id,
              plan: 'premium',
              status: 'active',
              paymentProvider: 'dodo',
              paymentId: paymentReference,
              currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
          });

          await prisma.payment.create({
            data: {
              userId: user.id,
              provider: 'dodo',
              providerPaymentId: paymentReference,
              amount: payload.amount || 2.0,
              currency: payload.currency || 'USD',
              status: 'succeeded',
              rawWebhook: payload,
            },
          });
        }
      }
    }

    await prisma.webhookEvent.updateMany({
      where: {
        provider: 'dodo',
        providerEventId: payload.id || payload.payment_id,
        processed: false,
      },
      data: {
        processed: true,
        processedAt: new Date(),
      },
    });

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/events', async (req: any, res: any) => {
  try {
    const { provider, processed, limit = '50' } = req.query;
    const events = await prisma.webhookEvent.findMany({
      where: {
        ...(provider && { provider: provider as string }),
        ...(processed !== undefined && { processed: processed === 'true' }),
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
    });

    res.json(events);
  } catch (error) {
    console.error('Get webhook events error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
