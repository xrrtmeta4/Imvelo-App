CREATE TABLE IF NOT EXISTS public.usage_counters (
  user_id uuid NOT NULL,
  kind text NOT NULL,
  period_key text NOT NULL,
  count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, kind, period_key)
);

GRANT SELECT ON public.usage_counters TO authenticated;
GRANT ALL ON public.usage_counters TO service_role;

ALTER TABLE public.usage_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own usage"
ON public.usage_counters FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.consume_usage(_user_id uuid, _kind text, _limit integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_premium boolean;
  pkey text;
  new_count integer;
BEGIN
  IF _kind NOT IN ('scan', 'chat') THEN
    RAISE EXCEPTION 'invalid usage kind';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.premium_subscriptions s
    WHERE s.user_id = _user_id
      AND s.status = 'active'
      AND (s.expires_at IS NULL OR s.expires_at > now())
  ) INTO is_premium;

  IF is_premium THEN
    RETURN jsonb_build_object('allowed', true, 'unlimited', true, 'remaining', -1);
  END IF;

  pkey := CASE WHEN _kind = 'scan'
    THEN to_char(now() AT TIME ZONE 'UTC', 'IYYY-"W"IW')
    ELSE to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD') END;

  INSERT INTO public.usage_counters (user_id, kind, period_key, count)
  VALUES (_user_id, _kind, pkey, 1)
  ON CONFLICT (user_id, kind, period_key) DO UPDATE
    SET count = public.usage_counters.count + 1,
        updated_at = now()
    WHERE public.usage_counters.count < _limit
  RETURNING count INTO new_count;

  IF new_count IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'unlimited', false, 'remaining', 0, 'limit', _limit);
  END IF;

  RETURN jsonb_build_object('allowed', true, 'unlimited', false, 'remaining', GREATEST(0, _limit - new_count), 'limit', _limit);
END;
$$;

REVOKE ALL ON FUNCTION public.consume_usage(uuid, text, integer) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_usage(uuid, text, integer) TO service_role;