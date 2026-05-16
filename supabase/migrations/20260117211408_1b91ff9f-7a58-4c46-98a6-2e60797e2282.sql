-- Add UPDATE policy for avatars bucket so users can upsert their avatars
CREATE POLICY "Users can update own avatar"
ON storage.objects
FOR UPDATE
TO public
USING (bucket_id = 'avatars' AND auth.role() = 'authenticated')
WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

-- Add DELETE policy for avatars bucket so users can replace their avatars
CREATE POLICY "Users can delete own avatar"
ON storage.objects
FOR DELETE
TO public
USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');