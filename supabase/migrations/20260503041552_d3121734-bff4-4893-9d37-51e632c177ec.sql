-- Add country/country_code to profiles for proper geo segmentation
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS country_code text;

-- Add country/region structure to climate_observations
ALTER TABLE public.climate_observations
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS country_code text,
  ADD COLUMN IF NOT EXISTS admin_region text;

-- Backfill country on observations from the owning profile when possible
UPDATE public.climate_observations co
SET country = p.country,
    country_code = p.country_code
FROM public.profiles p
WHERE co.user_id = p.id
  AND co.country IS NULL
  AND p.country IS NOT NULL;

-- Indices for fast country-scoped analytics
CREATE INDEX IF NOT EXISTS idx_climate_obs_country ON public.climate_observations(country_code, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_climate_obs_country_region ON public.climate_observations(country_code, admin_region, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_country ON public.profiles(country_code);

-- Trigger to auto-populate country from profile on insert if missing
CREATE OR REPLACE FUNCTION public.set_climate_obs_country()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.country IS NULL OR NEW.country_code IS NULL THEN
    SELECT COALESCE(NEW.country, p.country),
           COALESCE(NEW.country_code, p.country_code)
      INTO NEW.country, NEW.country_code
    FROM public.profiles p
    WHERE p.id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_climate_obs_country ON public.climate_observations;
CREATE TRIGGER trg_set_climate_obs_country
BEFORE INSERT ON public.climate_observations
FOR EACH ROW EXECUTE FUNCTION public.set_climate_obs_country();

-- Country-aggregated rollup view for cross-user research per country
CREATE OR REPLACE VIEW public.climate_observations_by_country AS
SELECT
  country_code,
  country,
  admin_region,
  date_trunc('day', observed_at) AS day,
  COUNT(*) AS sample_count,
  AVG(temperature) AS avg_temperature,
  AVG(humidity) AS avg_humidity,
  SUM(rainfall_mm) AS total_rainfall_mm,
  AVG(wind_speed_kmh) AS avg_wind_kmh,
  AVG(soil_moisture) AS avg_soil_moisture
FROM public.climate_observations
WHERE country_code IS NOT NULL
GROUP BY country_code, country, admin_region, date_trunc('day', observed_at);