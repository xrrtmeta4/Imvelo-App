CREATE OR REPLACE FUNCTION public.consume_usage(_user_id uuid, _kind text, _limit integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_plan text;
  pkey text;
  new_count integer;
BEGIN
  IF _kind NOT IN ('scan', 'chat') THEN
    RAISE EXCEPTION 'invalid usage kind';
  END IF;

  SELECT plan INTO user_plan
  FROM public.premium_subscriptions
  WHERE user_id = _user_id
    AND status = 'active'
    AND (expires_at IS NULL OR expires_at > now())
  LIMIT 1;

  IF user_plan = 'premium' THEN
    IF _kind = 'scan' THEN
      _limit := 1;
      pkey := to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD');
    ELSE
      _limit := 2;
      pkey := to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD');
    END IF;
  ELSE
    IF _kind = 'scan' THEN
      _limit := 2;
      pkey := to_char(now() AT TIME ZONE 'UTC', 'IYYY-"W"IW');
    ELSE
      _limit := 3;
      pkey := to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD');
    END IF;
  END IF;

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
