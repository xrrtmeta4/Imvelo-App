
-- Soft delete column for pest_reports so user "delete" hides but keeps record
ALTER TABLE public.pest_reports
  ADD COLUMN IF NOT EXISTS hidden_by_user boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hidden_at timestamptz;

-- Grant target user 1 year premium
INSERT INTO public.premium_subscriptions (user_id, status, payment_reference, plan, expires_at)
VALUES ('3eb7f219-7c1d-4005-bf00-abdc1314b364', 'active', 'manual_grant_1yr', 'premium', NOW() + INTERVAL '1 year')
ON CONFLICT DO NOTHING;

-- If user already had a row, update it instead
UPDATE public.premium_subscriptions
SET status = 'active',
    plan = 'premium',
    payment_reference = 'manual_grant_1yr',
    expires_at = NOW() + INTERVAL '1 year'
WHERE user_id = '3eb7f219-7c1d-4005-bf00-abdc1314b364';
