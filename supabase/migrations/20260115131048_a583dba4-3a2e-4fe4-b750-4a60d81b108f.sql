-- Fix SECURITY DEFINER functions without search_path set
CREATE OR REPLACE FUNCTION public.increment_listing_views(listing_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE marketplace_listings
  SET views = views + 1
  WHERE id = listing_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_listing_messages(listing_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE marketplace_listings
  SET messages_received = messages_received + 1
  WHERE id = listing_id;
END;
$$;

-- Fix handle_new_user function to also have search_path set (already has it, but ensure consistency)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'farmer')
  );
  RETURN NEW;
END;
$$;

-- Fix PUBLIC_DATA_EXPOSURE: Restrict profiles SELECT policy
-- Users should only be able to view their own profile fully
-- Create a helper function to check if user has extension_officer role
CREATE OR REPLACE FUNCTION public.is_extension_officer(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id
      AND role = 'extension_officer'::app_role
  )
$$;

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;

-- Users can only view their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Extension officers need to view reporter profiles for pest reports
-- Allow extension officers to view profiles of users who submitted pest reports
CREATE POLICY "Extension officers can view reporter profiles"
  ON profiles FOR SELECT
  USING (
    public.is_extension_officer(auth.uid()) AND
    EXISTS (
      SELECT 1 FROM pest_reports
      WHERE pest_reports.user_id = profiles.id
    )
  );

-- For marketplace, sellers profiles should be viewable by potential buyers
-- Allow viewing profiles of marketplace listing sellers
CREATE POLICY "Users can view seller profiles"
  ON profiles FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM marketplace_listings
      WHERE marketplace_listings.seller_id = profiles.id
        AND marketplace_listings.status = 'active'
    )
  );

-- Allow viewing profiles of users you have messages with
CREATE POLICY "Users can view message participant profiles"
  ON profiles FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM messages
      WHERE (messages.sender_id = profiles.id OR messages.receiver_id = profiles.id)
        AND (messages.sender_id = auth.uid() OR messages.receiver_id = auth.uid())
    )
  );