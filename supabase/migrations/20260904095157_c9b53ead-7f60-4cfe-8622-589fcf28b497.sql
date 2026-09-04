CREATE TABLE public.farm_zones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  crop TEXT,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  radius_m NUMERIC NOT NULL DEFAULT 100,
  notes TEXT,
  monitoring_enabled BOOLEAN NOT NULL DEFAULT true,
  last_report JSONB,
  last_scanned_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.farm_zones TO authenticated;
GRANT ALL ON public.farm_zones TO service_role;

ALTER TABLE public.farm_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own farm zones"
ON public.farm_zones FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX farm_zones_user_idx ON public.farm_zones(user_id);

CREATE TRIGGER update_farm_zones_updated_at
BEFORE UPDATE ON public.farm_zones
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();