import { Router } from 'express';
import { handleWebhook } from '../payment/paymentService.js';
import { prisma } from '../db.js';

const router = Router();

// Dodo webhook. The backend is the authority: signatures are verified and the
// event is processed idempotently before any subscription is activated.
router.post('/dodo', async (req: any, res: any) => {
  try {
    const rawBody: string = req.rawBody || JSON.stringify(req.body);
    const signature =
      (req.headers['dodo-signature'] as string) ||
      (req.headers['x-webhook-signature'] as string);

    const result = await handleWebhook(rawBody, signature);
    res.status(200).json({ received: true, alreadyProcessed: result.alreadyProcessed });
  } catch (error) {
    console.error('Webhook error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    if (message.includes('signature')) {
      return res.status(401).json({ error: message });
    }
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
      take: parseInt(limit as string, 10),
    });
    res.json(events);
  } catch (error) {
    console.error('Get webhook events error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
