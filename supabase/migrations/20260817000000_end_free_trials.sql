-- End existing free trials and remove automatic free trial trigger

UPDATE public.premium_subscriptions
SET status = 'expired', expires_at = NOW()
WHERE payment_reference = 'free_trial' AND status = 'active';

DROP TRIGGER IF EXISTS on_profile_created_free_trial ON public.profiles;

DROP FUNCTION IF EXISTS public.create_free_trial();
