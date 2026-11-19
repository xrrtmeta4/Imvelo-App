-- 1. Private scheduler secret so background jobs prove who they are
CREATE TABLE IF NOT EXISTS public.internal_job_secrets (
  name text PRIMARY KEY,
  secret text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.internal_job_secrets FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.internal_job_secrets TO service_role;
ALTER TABLE public.internal_job_secrets ENABLE ROW LEVEL SECURITY;

INSERT INTO public.internal_job_secrets (name, secret)
VALUES ('cron_secret', encode(extensions.gen_random_bytes(32), 'hex'))
ON CONFLICT (name) DO NOTHING;

CREATE OR REPLACE FUNCTION public.verify_cron_secret(_secret text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _secret IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.internal_job_secrets WHERE name = 'cron_secret' AND secret = _secret
  );
$$;
REVOKE ALL ON FUNCTION public.verify_cron_secret(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_cron_secret(text) TO service_role;

SELECT cron.schedule(
  'dispatch-early-warnings-job',
  '0 */3 * * *',
  $cmd$
  select net.http_post(
    url:='https://ufoketygwxdlusngppef.supabase.co/functions/v1/dispatch-early-warnings',
    headers:=jsonb_build_object(
      'Content-Type','application/json',
      'x-cron-secret',(select secret from public.internal_job_secrets where name='cron_secret' limit 1)
    ),
    body:='{}'::jsonb
  );
  $cmd$
);

-- 2. Old marketplace counters: no longer callable by app users
REVOKE EXECUTE ON FUNCTION public.increment_listing_views(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_listing_messages(uuid) FROM PUBLIC, anon, authenticated;

-- 3. Knowledge graph: shared reference data, readable only by signed-in users
DROP POLICY IF EXISTS "Authenticated users can read knowledge nodes" ON public.knowledge_nodes;
CREATE POLICY "Signed-in users can read knowledge nodes" ON public.knowledge_nodes
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Authenticated users can read knowledge edges" ON public.knowledge_edges;
CREATE POLICY "Signed-in users can read knowledge edges" ON public.knowledge_edges
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

-- 4. Push subscriptions must point at a real browser push service
CREATE OR REPLACE FUNCTION public.validate_push_endpoint()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.endpoint !~* '^https://(fcm\.googleapis\.com|android\.googleapis\.com|updates\.push\.services\.mozilla\.com|[a-z0-9.-]+\.push\.services\.mozilla\.com|[a-z0-9.-]+\.push\.apple\.com|[a-z0-9.-]+\.notify\.windows\.com)/' THEN
    RAISE EXCEPTION 'Unsupported push endpoint';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS validate_push_endpoint_trg ON public.push_subscriptions;
CREATE TRIGGER validate_push_endpoint_trg
  BEFORE INSERT OR UPDATE OF endpoint ON public.push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.validate_push_endpoint();