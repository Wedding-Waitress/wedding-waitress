-- Create invitations storage bucket for digital invitations
INSERT INTO storage.buckets (id, name, public)
VALUES ('invitations', 'invitations', true);

-- Create RLS policies for invitations bucket
CREATE POLICY "Event owners can upload invitations"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'invitations' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Event owners can update their invitations"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'invitations' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Event owners can delete their invitations"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'invitations' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Invitations are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'invitations');