
-- Migration: 20251108181923
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('farmer', 'trader', 'extension_officer');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone_number TEXT,
  role public.app_role NOT NULL DEFAULT 'farmer',
  location TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create pest reports table
CREATE TABLE public.pest_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  pest_name TEXT,
  treatment TEXT,
  confidence DECIMAL,
  notes TEXT,
  location TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.pest_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own pest reports"
  ON public.pest_reports FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own pest reports"
  ON public.pest_reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Extension officers can view all reports"
  ON public.pest_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'extension_officer'
    )
  );

-- Create marketplace listings table
CREATE TABLE public.marketplace_listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  category TEXT NOT NULL,
  price DECIMAL NOT NULL,
  unit TEXT NOT NULL,
  quantity DECIMAL,
  description TEXT,
  image_url TEXT,
  location TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.marketplace_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active listings"
  ON public.marketplace_listings FOR SELECT
  USING (status = 'active');

CREATE POLICY "Sellers can manage own listings"
  ON public.marketplace_listings FOR ALL
  USING (auth.uid() = seller_id);

-- Create messages table
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES public.marketplace_listings(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own messages"
  ON public.messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send messages"
  ON public.messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update messages they received"
  ON public.messages FOR UPDATE
  USING (auth.uid() = receiver_id);

-- Create function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'farmer')
  );
  RETURN NEW;
END;
$$;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Add updated_at triggers
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.marketplace_listings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Migration: 20251108182023
-- Fix search path for handle_updated_at function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Migration: 20251108182115
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum for user roles (only if not exists)
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('farmer', 'trader', 'extension_officer');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone_number TEXT,
  role public.app_role NOT NULL DEFAULT 'farmer',
  location TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Profiles policies
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create pest reports table
CREATE TABLE IF NOT EXISTS public.pest_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  pest_name TEXT,
  treatment TEXT,
  confidence DECIMAL,
  notes TEXT,
  location TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.pest_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own pest reports" ON public.pest_reports;
DROP POLICY IF EXISTS "Users can create own pest reports" ON public.pest_reports;
DROP POLICY IF EXISTS "Extension officers can view all reports" ON public.pest_reports;

CREATE POLICY "Users can view own pest reports"
  ON public.pest_reports FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own pest reports"
  ON public.pest_reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Extension officers can view all reports"
  ON public.pest_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'extension_officer'
    )
  );

-- Create marketplace listings table
CREATE TABLE IF NOT EXISTS public.marketplace_listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  category TEXT NOT NULL,
  price DECIMAL NOT NULL,
  unit TEXT NOT NULL,
  quantity DECIMAL,
  description TEXT,
  image_url TEXT,
  location TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.marketplace_listings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active listings" ON public.marketplace_listings;
DROP POLICY IF EXISTS "Sellers can manage own listings" ON public.marketplace_listings;

CREATE POLICY "Anyone can view active listings"
  ON public.marketplace_listings FOR SELECT
  USING (status = 'active');

CREATE POLICY "Sellers can manage own listings"
  ON public.marketplace_listings FOR ALL
  USING (auth.uid() = seller_id);

-- Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES public.marketplace_listings(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
DROP POLICY IF EXISTS "Users can update messages they received" ON public.messages;

CREATE POLICY "Users can view own messages"
  ON public.messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send messages"
  ON public.messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update messages they received"
  ON public.messages FOR UPDATE
  USING (auth.uid() = receiver_id);

-- Create function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'farmer')
  );
  RETURN NEW;
END;
$$;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Drop and recreate updated_at triggers
DROP TRIGGER IF EXISTS set_updated_at ON public.profiles;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.marketplace_listings;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.marketplace_listings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Migration: 20251108182130
-- Create storage bucket for images
INSERT INTO storage.buckets (id, name, public)
VALUES ('pest-images', 'pest-images', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('marketplace-images', 'marketplace-images', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for pest images
CREATE POLICY "Anyone can view pest images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'pest-images');

CREATE POLICY "Authenticated users can upload pest images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'pest-images' AND auth.role() = 'authenticated');

-- Storage policies for marketplace images
CREATE POLICY "Anyone can view marketplace images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'marketplace-images');

CREATE POLICY "Authenticated users can upload marketplace images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'marketplace-images' AND auth.role() = 'authenticated');

-- Storage policies for avatars
CREATE POLICY "Anyone can view avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');
