
-- Create a trigger to automatically give new users a 7-day free trial
CREATE OR REPLACE FUNCTION public.create_free_trial()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.premium_subscriptions (user_id, status, payment_reference, expires_at)
  VALUES (NEW.id, 'active', 'free_trial', NOW() + INTERVAL '7 days')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger after profile creation (which happens on signup)
CREATE TRIGGER on_profile_created_free_trial
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_free_trial();
