-- Private, owner-scoped profile photos and business logos.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS profile_image_path text,
  ADD COLUMN IF NOT EXISTS profile_image_fit text NOT NULL DEFAULT 'cover'
    CHECK (profile_image_fit IN ('cover', 'contain')),
  ADD COLUMN IF NOT EXISTS profile_image_position_x smallint NOT NULL DEFAULT 50
    CHECK (profile_image_position_x BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS profile_image_position_y smallint NOT NULL DEFAULT 50
    CHECK (profile_image_position_y BETWEEN 0 AND 100);

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_profile_image_path_owner_check
  CHECK (profile_image_path IS NULL OR profile_image_path = id::text || '/profile-image');

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-images',
  'profile-images',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "Users read own profile image"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'profile-images'
  AND name = auth.uid()::text || '/profile-image'
);

CREATE POLICY "Users upload own profile image"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'profile-images'
  AND name = auth.uid()::text || '/profile-image'
);

CREATE POLICY "Users update own profile image"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'profile-images'
  AND name = auth.uid()::text || '/profile-image'
)
WITH CHECK (
  bucket_id = 'profile-images'
  AND name = auth.uid()::text || '/profile-image'
);

CREATE POLICY "Users delete own profile image"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'profile-images'
  AND name = auth.uid()::text || '/profile-image'
);
