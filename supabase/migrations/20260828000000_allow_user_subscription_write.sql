-- Allow authenticated users to manage their OWN premium_subscriptions row.
-- Enables client-side plan activation after a successful Dodo checkout return
-- (app is redirected to /upgrade?success=true&plan=<tier>), removing the hard
-- dependency on the Dodo webhook for activation. The webhook remains the
-- authoritative path; this is a secure, webhook-free fallback because it only
-- ever writes the caller's own row (USING/WITH CHECK on auth.uid()).
-- NOTE: CREATE POLICY ... IF NOT EXISTS requires PostgreSQL 16+. Supabase
-- projects are commonly on PG 15, so we DROP (if exists) then CREATE.
DROP POLICY IF EXISTS "Users can manage own subscription"
  ON public.premium_subscriptions;

CREATE POLICY "Users can manage own subscription"
  ON public.premium_subscriptions
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
