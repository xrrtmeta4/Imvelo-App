
-- Livestock table
CREATE TABLE public.livestock (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  animal_type TEXT NOT NULL,
  breed TEXT,
  name TEXT,
  tag_id TEXT,
  birth_date DATE,
  gender TEXT DEFAULT 'unknown',
  weight_kg NUMERIC,
  health_status TEXT DEFAULT 'healthy',
  vaccination_history JSONB DEFAULT '[]'::jsonb,
  breeding_status TEXT,
  feed_schedule TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.livestock ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own livestock" ON public.livestock FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Crop rotations table
CREATE TABLE public.crop_rotations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  plot_name TEXT NOT NULL,
  plot_size NUMERIC,
  plot_unit TEXT DEFAULT 'hectares',
  rotation_plan JSONB DEFAULT '[]'::jsonb,
  current_season TEXT,
  current_crop TEXT,
  soil_type TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.crop_rotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own rotations" ON public.crop_rotations FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Harvests table
CREATE TABLE public.harvests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  crop_name TEXT NOT NULL,
  plot_name TEXT,
  harvest_date DATE NOT NULL DEFAULT CURRENT_DATE,
  quantity NUMERIC NOT NULL,
  unit TEXT DEFAULT 'kg',
  quality_grade TEXT DEFAULT 'A',
  season TEXT,
  revenue NUMERIC,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.harvests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own harvests" ON public.harvests FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Price alerts table
CREATE TABLE public.price_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  commodity TEXT NOT NULL,
  target_price NUMERIC NOT NULL,
  direction TEXT NOT NULL DEFAULT 'above',
  current_price NUMERIC,
  is_active BOOLEAN DEFAULT true,
  triggered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own price alerts" ON public.price_alerts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Farm inventory table
CREATE TABLE public.farm_inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  item_name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  quantity NUMERIC NOT NULL DEFAULT 0,
  unit TEXT DEFAULT 'units',
  low_stock_threshold NUMERIC DEFAULT 5,
  purchase_date DATE,
  expiry_date DATE,
  cost_per_unit NUMERIC,
  supplier TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.farm_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own inventory" ON public.farm_inventory FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
