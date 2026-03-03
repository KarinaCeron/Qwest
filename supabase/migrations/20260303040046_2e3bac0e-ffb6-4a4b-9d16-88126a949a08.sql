
-- Create storage bucket for CVs
INSERT INTO storage.buckets (id, name, public) VALUES ('cvs', 'cvs', false);

-- Allow authenticated users to upload their own CV
CREATE POLICY "Users can upload their own CV"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'cvs' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to view their own CV
CREATE POLICY "Users can view their own CV"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'cvs' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to update their own CV
CREATE POLICY "Users can update their own CV"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'cvs' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to delete their own CV
CREATE POLICY "Users can delete their own CV"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'cvs' AND auth.uid()::text = (storage.foldername(name))[1]);
