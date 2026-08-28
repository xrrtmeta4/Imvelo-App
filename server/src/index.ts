import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { app } from './middleware.js';

dotenv.config();

const PORT = process.env.PORT || 3000;

app.get('/health', (req: express.Request, res: express.Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/payments', (await import('./routes/paymentRoutes.js')).default);
app.use('/api/subscriptions', (await import('./routes/subscriptionRoutes.js')).default);
app.use('/api/webhooks', (await import('./routes/webhookRoutes.js')).default);

app.use((req: express.Request, res: express.Response) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => {
  console.log(`Imvelo Payment Server running on port ${PORT}`);
});
