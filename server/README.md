# Imvelo Payment Server

Express backend for Imvelo App payment processing.

## Setup

1. Copy `.env.example` to `.env` and fill in your database URL and payment provider keys.
2. Install dependencies: `npm install`
3. Generate Prisma client: `npm run db:generate`
4. Run migrations: `npm run db:migrate`
5. Seed database: `npm run db:seed`
6. Start dev server: `npm run dev`

## Endpoints

- `POST /api/payments/checkout` - Create checkout session
- `GET /api/payments/:id` - Get payment status
- `GET /api/subscriptions/user/:userId` - Get user subscription
- `POST /api/subscriptions/upgrade` - Upgrade subscription
- `POST /api/webhooks/dodo` - Dodo Payments webhook
- `GET /api/webhooks/events` - List webhook events
