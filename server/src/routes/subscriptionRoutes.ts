import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.get('/user/:userId', async (req: any, res: any) => {
  try {
    const { userId } = req.params;
    const subscription = await prisma.subscription.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    res.json(subscription || { plan: 'free', status: 'active' });
  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/upgrade', async (req: any, res: any) => {
  try {
    const { userId, plan, paymentId } = req.body;

    if (!userId || !plan) {
      return res.status(400).json({ error: 'userId and plan are required' });
    }

    const subscription = await prisma.subscription.upsert({
      where: { id: `${userId}-${plan}` },
      update: {
        plan,
        status: 'active',
        paymentId: paymentId || undefined,
      },
      create: {
        userId,
        plan,
        status: 'active',
        paymentId: paymentId || undefined,
      },
    });

    res.json(subscription);
  } catch (error) {
    console.error('Upgrade subscription error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
