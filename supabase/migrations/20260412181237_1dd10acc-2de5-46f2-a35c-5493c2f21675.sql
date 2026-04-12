
-- Climate observations table for harvesting data for future research
CREATE TABLE public.climate_observations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  temperature NUMERIC,
  humidity NUMERIC,
  rainfall_mm NUMERIC,
  wind_speed_kmh NUMERIC,
  soil_moisture NUMERIC,
  weather_code INTEGER,
  observation_source TEXT NOT NULL DEFAULT 'weather_api',
  crop_impact TEXT,
  region TEXT,
  notes TEXT,
  observed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.climate_observations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read climate observations"
ON public.climate_observations FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create climate observations"
ON public.climate_observations FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Service role can manage climate observations"
ON public.climate_observations FOR ALL
USING (true) WITH CHECK (true);

-- Index for efficient querying by region and date
CREATE INDEX idx_climate_observations_region ON public.climate_observations (region);
CREATE INDEX idx_climate_observations_observed_at ON public.climate_observations (observed_at);
CREATE INDEX idx_climate_observations_location ON public.climate_observations (latitude, longitude);

-- Climate research exports tracking
CREATE TABLE public.climate_research_exports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  export_format TEXT NOT NULL DEFAULT 'csv',
  date_range_start DATE,
  date_range_end DATE,
  region_filter TEXT,
  record_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.climate_research_exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own exports"
ON public.climate_research_exports FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own exports"
ON public.climate_research_exports FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);
