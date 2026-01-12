-- Add preferred_language column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'en';

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.preferred_language IS 'User preferred language code for AI assistant responses';