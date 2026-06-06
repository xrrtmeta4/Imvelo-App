CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  requested_role app_role;
  safe_role app_role;
BEGIN
  BEGIN
    requested_role := COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'farmer'::app_role);
  EXCEPTION WHEN others THEN
    requested_role := 'farmer'::app_role;
  END;

  -- Never allow self-signup as a privileged role
  IF requested_role = 'extension_officer'::app_role THEN
    safe_role := 'farmer'::app_role;
  ELSE
    safe_role := requested_role;
  END IF;

  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    safe_role
  );
  RETURN NEW;
END;
$function$;