
-- 1. premium_subscriptions: restrict service-role policy to actual service role
DROP POLICY IF EXISTS "Service role can manage subscriptions" ON public.premium_subscriptions;
CREATE POLICY "Service role can manage subscriptions"
  ON public.premium_subscriptions
  AS PERMISSIVE
  FOR ALL
  TO public
  USING ((auth.jwt() ->> 'role') = 'service_role')
  WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

-- 2. push_subscriptions: drop the public read policy (service_role bypasses RLS anyway)
DROP POLICY IF EXISTS "Service role can read all push subscriptions" ON public.push_subscriptions;

-- 3. ussd_sessions: restrict to service role
DROP POLICY IF EXISTS "Service role can manage USSD sessions" ON public.ussd_sessions;
CREATE POLICY "Service role can manage USSD sessions"
  ON public.ussd_sessions
  AS PERMISSIVE
  FOR ALL
  TO public
  USING ((auth.jwt() ->> 'role') = 'service_role')
  WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

-- 4. weather_alerts: restrict insert to service role
DROP POLICY IF EXISTS "Service role can insert alerts" ON public.weather_alerts;
CREATE POLICY "Service role can insert alerts"
  ON public.weather_alerts
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

-- 5. Prevent users from escalating their own profile role (e.g. to extension_officer)
CREATE OR REPLACE FUNCTION public.prevent_role_self_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     AND COALESCE((auth.jwt() ->> 'role'), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Changing role is not permitted';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_role_self_escalation_trg ON public.profiles;
CREATE TRIGGER prevent_role_self_escalation_trg
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_role_self_escalation();

-- 6. Storage: scope avatar uploads/updates/deletes to the user's own folder
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;

CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update own avatar"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own avatar"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 7. Storage: scope marketplace-images and pest-images uploads to user's folder + add update/delete
DROP POLICY IF EXISTS "Authenticated users can upload marketplace images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload pest images" ON storage.objects;

CREATE POLICY "Users can upload own marketplace images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'marketplace-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update own marketplace images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'marketplace-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'marketplace-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own marketplace images"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'marketplace-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can upload own pest images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'pest-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update own pest images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'pest-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'pest-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own pest images"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'pest-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 8. Lock down SECURITY DEFINER helpers from anonymous access
REVOKE EXECUTE ON FUNCTION public.is_extension_officer(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_my_profile_pii() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.increment_listing_views(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.increment_listing_messages(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_extension_officer(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_profile_pii() TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_listing_views(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_listing_messages(uuid) TO authenticated;

-- 9. Pin search_path on remaining trigger helpers
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;
