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