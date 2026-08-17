import { z } from 'zod';

export const createCheckoutSchema = z.object({
  product_id: z.string().min(1),
  product_name: z.string().min(1),
  amount: z.number().positive(),
  currency: z.string().length(3).default('USD'),
  customer_email: z.string().email().optional(),
  customer_name: z.string().optional(),
  payment_methods: z.array(z.string()).optional(),
  success_url: z.string().url().optional(),
  cancel_url: z.string().url().optional(),
  metadata: z.record(z.any()).optional(),
});

export const webhookSchema = z.object({
  provider: z.enum(['stripe', 'paypal', 'dodo']),
  eventType: z.string(),
  payload: z.any(),
  signature: z.string().optional(),
});

export type CreateCheckoutInput = z.infer<typeof createCheckoutSchema>;
export type WebhookInput = z.infer<typeof webhookSchema>;
