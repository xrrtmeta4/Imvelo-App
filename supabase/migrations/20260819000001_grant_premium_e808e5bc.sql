-- Grant full premium + full app access to user e808e5bc-ba1b-4271-94a9-e8adb3814501.
-- Lifetime grant: status=active, plan=premium, expires in 100 years.
-- Idempotent: if a subscription row already exists for this user, it is updated.

insert into public.premium_subscriptions (user_id, status, payment_reference, plan, expires_at)
values
  ('e808e5bc-ba1b-4271-94a9-e8adb3814501'::uuid, 'active', 'manual_grant_lifetime', 'premium', now() + interval '100 years')
on conflict (user_id) do update
  set status = 'active',
      plan = 'premium',
      payment_reference = 'manual_grant_lifetime',
      expires_at = now() + interval '100 years';
