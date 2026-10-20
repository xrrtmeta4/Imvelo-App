DROP POLICY IF EXISTS "Users can manage own subscription" ON public.premium_subscriptions;
REVOKE INSERT, UPDATE, DELETE ON public.premium_subscriptions FROM anon, authenticated;
GRANT SELECT ON public.premium_subscriptions TO authenticated;
GRANT ALL ON public.premium_subscriptions TO service_role;
DROP POLICY IF EXISTS "Service role can manage climate observations" ON public.climate_observations;
DROP POLICY IF EXISTS "Authenticated users can create climate observations" ON public.climate_observations;
DROP POLICY IF EXISTS "Authenticated users can read climate observations" ON public.climate_observations;
CREATE POLICY "Users read own climate observations" ON public.climate_observations FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
CREATE POLICY "Users create own climate observations" ON public.climate_observations FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "Service role manages climate observations" ON public.climate_observations FOR ALL TO service_role USING (true) WITH CHECK (true);
REVOKE ALL ON public.climate_observations FROM anon;
GRANT SELECT, INSERT ON public.climate_observations TO authenticated;
GRANT ALL ON public.climate_observations TO service_role;
CREATE TABLE IF NOT EXISTS public.user_roles (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 role public.app_role NOT NULL,
 UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own assigned roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
INSERT INTO public.user_roles(user_id, role) SELECT id, role FROM public.profiles WHERE role = 'extension_officer' ON CONFLICT DO NOTHING;
CREATE OR REPLACE FUNCTION public.is_extension_officer(_user_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'extension_officer'); $$;
REVOKE ALL ON FUNCTION public.is_extension_officer(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_extension_officer(uuid) TO authenticated, service_role;