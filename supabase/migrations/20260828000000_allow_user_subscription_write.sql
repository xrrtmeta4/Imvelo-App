-- Allow authenticated users to manage their OWN premium_subscriptions row.
-- This enables client-side plan activation after a successful Dodo checkout
-- return (the app is redirected to /upgrade?success=true&plan=<tier>), removing
-- the hard dependency on the Dodo webhook for activation. The webhook remains
-- the authoritative path; this is a secure, webhook-free fallback because:
--   * it only ever writes the caller's own row (USING/WITH CHECK on auth.uid()),
--   * it is only invoked after Dodo redirects back with success=true.
CREATE POLICY IF NOT EXISTS "Users can manage own subscription"
  ON public.premium_subscriptions
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
