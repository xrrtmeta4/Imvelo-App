-- Grant full unlimited Enterprise access to user e808e5bc-ba1b-4271-94a9-e8adb3814501 (no scan/chat/ledger limits).
-- Lifetime grant: status=active, plan=enterprise, expires_at = NULL (never expires).
-- Idempotent: if a subscription row already exists for this user, it is updated.

insert into public.premium_subscriptions (user_id, status, payment_reference, plan, expires_at)
values
  ('e808e5bc-ba1b-4271-94a9-e8adb3814501'::uuid, 'active', 'manual_grant_lifetime_unlimited', 'enterprise', null)
on conflict (user_id) do update
  set status = 'active',
      plan = 'enterprise',
      payment_reference = 'manual_grant_lifetime_unlimited',
      expires_at = null;
