
-- Add plan column to premium_subscriptions
ALTER TABLE public.premium_subscriptions 
ADD COLUMN plan text NOT NULL DEFAULT 'starter';

-- Update existing free trial records to 'starter'
UPDATE public.premium_subscriptions SET plan = 'starter' WHERE payment_reference = 'free_trial';

-- Update the free trial trigger to set plan = 'starter'
CREATE OR REPLACE FUNCTION public.create_free_trial()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.premium_subscriptions (user_id, status, payment_reference, expires_at, plan)
  VALUES (NEW.id, 'active', 'free_trial', NOW() + INTERVAL '7 days', 'starter')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$function$;
