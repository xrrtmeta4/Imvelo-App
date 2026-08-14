-- ============================================================
-- Imvelo App PostgreSQL Backup Schema
-- Mirror of Supabase production schema for failover/backup
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- Core auth/profile tables
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY,
  full_name TEXT NOT NULL,
  full_name_enc BYTEA,
  phone_number TEXT,
  phone_enc BYTEA,
  role TEXT NOT NULL DEFAULT 'farmer',
  location TEXT,
  country TEXT,
  country_code TEXT,
  country_enc BYTEA,
  data_category TEXT NOT NULL DEFAULT 'pii_protected',
  preferred_language TEXT DEFAULT 'en',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.premium_subscriptions (
  id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active',
  payment_reference TEXT,
  expires_at TIMESTAMPTZ,
  plan TEXT NOT NULL DEFAULT 'starter',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.usage_counters (
  user_id UUID NOT NULL,
  kind TEXT NOT NULL,
  period_key TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, kind, period_key)
);

-- ============================================================
-- Farm data tables
-- ============================================================
CREATE TABLE IF NOT EXISTS public.farm_activities (
  id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL,
  activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
  activity_type TEXT NOT NULL,
  description TEXT,
  quantity DECIMAL,
  unit TEXT,
  notes TEXT,
  weather_conditions TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ledger_entries (
  id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('income', 'expense')),
  category TEXT NOT NULL,
  description TEXT,
  amount NUMERIC NOT NULL,
  payment_method TEXT,
  reference_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.budget_limits (
  id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL,
  category TEXT NOT NULL,
  monthly_limit NUMERIC NOT NULL,
  alert_threshold NUMERIC NOT NULL DEFAULT 80,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, category)
);

CREATE TABLE IF NOT EXISTS public.pesticide_schedules (
  id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL,
  crop_name TEXT NOT NULL,
  pesticide_name TEXT NOT NULL,
  application_date DATE NOT NULL,
  repeat_interval_days INTEGER,
  notes TEXT,
  reminder_sent BOOLEAN DEFAULT false,
  status TEXT NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.crop_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  crop_name TEXT NOT NULL,
  planting_start_month INTEGER NOT NULL CHECK (planting_start_month >= 1 AND planting_start_month <= 12),
  planting_end_month INTEGER NOT NULL CHECK (planting_end_month >= 1 AND planting_end_month <= 12),
  reminder_sent_this_season BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, crop_name)
);

CREATE TABLE IF NOT EXISTS public.livestock (
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.crop_rotations (
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.harvests (
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.price_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  commodity TEXT NOT NULL,
  target_price NUMERIC NOT NULL,
  direction TEXT NOT NULL DEFAULT 'above',
  current_price NUMERIC,
  is_active BOOLEAN DEFAULT true,
  triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.farm_inventory (
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Pest / disease / animal health
-- ============================================================
CREATE TABLE IF NOT EXISTS public.pest_reports (
  id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL,
  image_url TEXT NOT NULL,
  pest_name TEXT,
  treatment TEXT,
  confidence DECIMAL,
  notes TEXT,
  location TEXT,
  hidden_by_user BOOLEAN NOT NULL DEFAULT false,
  hidden_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.animal_disease_reports (
  id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL,
  animal_type TEXT,
  symptoms TEXT,
  diagnosis TEXT,
  treatment TEXT,
  image_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Marketplace / messaging
-- ============================================================
CREATE TABLE IF NOT EXISTS public.marketplace_listings (
  id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  seller_id UUID NOT NULL,
  product_name TEXT NOT NULL,
  category TEXT NOT NULL,
  price DECIMAL NOT NULL,
  unit TEXT NOT NULL,
  quantity DECIMAL,
  description TEXT,
  image_url TEXT,
  location TEXT,
  status TEXT DEFAULT 'active',
  views INTEGER DEFAULT 0,
  messages_received INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  sender_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  listing_id UUID REFERENCES public.marketplace_listings(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Notifications / USSD / weather
-- ============================================================
CREATE TABLE IF NOT EXISTS public.weather_alerts (
  id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL,
  alert_type TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT NOT NULL,
  weather_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh_key TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, endpoint)
);

CREATE TABLE IF NOT EXISTS public.ussd_sessions (
  id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id TEXT NOT NULL UNIQUE,
  phone_number TEXT NOT NULL,
  current_menu TEXT NOT NULL DEFAULT 'main',
  context JSONB DEFAULT '{}'::jsonb,
  last_input TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + interval '30 minutes')
);

CREATE TABLE IF NOT EXISTS public.ussd_crop_reports (
  id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  crop_name TEXT NOT NULL,
  symptoms TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Climate / research
-- ============================================================
CREATE TABLE IF NOT EXISTS public.climate_observations (
  id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
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
  country TEXT,
  country_code TEXT,
  admin_region TEXT,
  region TEXT,
  notes TEXT,
  observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.climate_research_exports (
  id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL,
  export_format TEXT NOT NULL DEFAULT 'csv',
  date_range_start DATE,
  date_range_end DATE,
  region_filter TEXT,
  record_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Knowledge graph
-- ============================================================
CREATE TYPE knowledge_node_type AS ENUM ('crop', 'pest', 'disease', 'treatment', 'soil_type', 'season', 'region');
CREATE TYPE knowledge_relationship AS ENUM ('affects', 'treats', 'grows_in', 'thrives_in', 'companion_to', 'incompatible_with', 'seasonal_for', 'found_in');

CREATE TABLE IF NOT EXISTS public.knowledge_nodes (
  id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  node_type knowledge_node_type NOT NULL,
  name TEXT NOT NULL,
  aliases JSONB DEFAULT '[]'::jsonb,
  properties JSONB DEFAULT '{}'::jsonb,
  confidence_score NUMERIC NOT NULL DEFAULT 0.5,
  interaction_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.knowledge_edges (
  id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  source_node_id UUID NOT NULL REFERENCES public.knowledge_nodes(id) ON DELETE CASCADE,
  target_node_id UUID NOT NULL REFERENCES public.knowledge_nodes(id) ON DELETE CASCADE,
  relationship knowledge_relationship NOT NULL,
  weight NUMERIC NOT NULL DEFAULT 0.5,
  metadata JSONB DEFAULT '{}'::jsonb,
  reported_by_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(source_node_id, target_node_id, relationship)
);

CREATE TABLE IF NOT EXISTS public.knowledge_contributions (
  id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL,
  contribution_type TEXT NOT NULL,
  source_node_id UUID REFERENCES public.knowledge_nodes(id),
  target_node_id UUID REFERENCES public.knowledge_nodes(id),
  edge_relationship TEXT,
  context JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Sync metadata / failover control
-- ============================================================
CREATE TABLE IF NOT EXISTS public.backup_sync_state (
  id TEXT PRIMARY KEY,
  last_synced_at TIMESTAMPTZ,
  last_supabase_snapshot_at TIMESTAMPTZ,
  failed_over BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.backup_sync_state (id, failed_over)
VALUES ('global', false)
ON CONFLICT (id) DO NOTHING;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_country ON public.profiles(country_code);
CREATE INDEX IF NOT EXISTS idx_pest_reports_user ON public.pest_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_status ON public.marketplace_listings(status);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON public.messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_weather_alerts_user ON public.weather_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_ussd_sessions_session ON public.ussd_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_climate_observations_region ON public.climate_observations(region);
CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_type ON public.knowledge_nodes(node_type);
CREATE INDEX IF NOT EXISTS idx_knowledge_edges_source ON public.knowledge_edges(source_node_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_edges_target ON public.knowledge_edges(target_node_id);

-- Triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_pesticide_schedules_updated_at ON public.pesticide_schedules;
CREATE TRIGGER update_pesticide_schedules_updated_at BEFORE UPDATE ON public.pesticide_schedules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_farm_activities_updated_at ON public.farm_activities;
CREATE TRIGGER update_farm_activities_updated_at BEFORE UPDATE ON public.farm_activities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ledger_entries_updated_at ON public.ledger_entries;
CREATE TRIGGER update_ledger_entries_updated_at BEFORE UPDATE ON public.ledger_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_budget_limits_updated_at ON public.budget_limits;
CREATE TRIGGER update_budget_limits_updated_at BEFORE UPDATE ON public.budget_limits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
