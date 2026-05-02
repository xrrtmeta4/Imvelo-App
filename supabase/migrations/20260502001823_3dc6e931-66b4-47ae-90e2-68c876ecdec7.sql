INSERT INTO public.premium_subscriptions (user_id, status, payment_reference, expires_at, plan)
VALUES ('0481c13b-e2b5-42fb-9ad6-81fce4a17fcd', 'active', 'admin_grant', NOW() + INTERVAL '100 years', 'premium')
ON CONFLICT DO NOTHING;