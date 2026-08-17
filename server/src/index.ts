import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { app } from './middleware';

dotenv.config();

const PORT = process.env.PORT || 3000;

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/payments', (await import('./routes/paymentRoutes')).default);
app.use('/api/subscriptions', (await import('./routes/subscriptionRoutes')).default);
app.use('/api/webhooks', (await import('./routes/webhookRoutes')).default);

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => {
  console.log(`Imvelo Payment Server running on port ${PORT}`);
});
