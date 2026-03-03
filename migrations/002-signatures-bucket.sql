-- Create signatures storage bucket (public, like logos)
INSERT INTO storage.buckets (id, name, public)
VALUES ('signatures', 'signatures', true)
ON CONFLICT (id) DO NOTHING;

-- Users can upload their own signatures
CREATE POLICY "Users can upload signatures"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'signatures'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can update their own signatures
CREATE POLICY "Users can update signatures"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'signatures'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Anyone can read signatures (needed for PDF rendering)
CREATE POLICY "Anyone can read signatures"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'signatures');
