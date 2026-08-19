-- Grant lifetime premium access to the named user (ncamisoxaba56@gmail.com).
-- Resolves the user_id by email from auth.users so it works regardless of
-- whether they sign in via Google or email/password. If the user does not yet
-- exist at migrate time, nothing is inserted (no row = free plan by default).

insert into public.premium_subscriptions (user_id, status, payment_reference, plan, expires_at)
select u.id, 'active', 'manual_grant_lifetime', 'premium', now() + interval '100 years'
from auth.users u
where lower(u.email) = lower('ncamisoxaba56@gmail.com')
on conflict (user_id) do update
  set status = 'active',
      plan = 'premium',
      payment_reference = 'manual_grant_lifetime',
      expires_at = now() + interval '100 years';
