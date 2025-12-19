-- Create storage bucket for email assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('assets', 'assets', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to assets bucket
CREATE POLICY "Public can view assets" ON storage.objects
FOR SELECT USING (bucket_id = 'assets');