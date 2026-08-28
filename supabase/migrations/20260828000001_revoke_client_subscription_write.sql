-- Remove the client-side write path for premium_subscriptions.
-- Subscription activation is now driven exclusively by the verified backend
-- webhook (service role) or a server-side status check. Clients may only
-- READ their own row; the "Users can view own subscription" SELECT policy
-- (added in 20260101090744) already covers that.
DROP POLICY IF EXISTS "Users can manage own subscription"
  ON public.premium_subscriptions;
