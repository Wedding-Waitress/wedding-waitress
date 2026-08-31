-- Idempotent final-schema catch-up for Invitations & Cards.
-- Prepared for staging only; this file is intentionally not applied by this change.

CREATE TABLE IF NOT EXISTS public.invitation_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT 'General',
  orientation text NOT NULL DEFAULT 'portrait',
  width_mm numeric NOT NULL DEFAULT 148,
  height_mm numeric NOT NULL DEFAULT 210,
  background_url text NOT NULL,
  thumbnail_url text,
  text_zones jsonb NOT NULL DEFAULT '[]'::jsonb,
  default_styles jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  card_type text NOT NULL DEFAULT 'invitation'
);

CREATE TABLE IF NOT EXISTS public.invitation_designs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES public.invitation_templates(id) ON DELETE CASCADE,
  custom_text jsonb NOT NULL DEFAULT '{}'::jsonb,
  custom_styles jsonb NOT NULL DEFAULT '{}'::jsonb,
  include_guest_name boolean NOT NULL DEFAULT false,
  include_qr_code boolean NOT NULL DEFAULT false,
  qr_position jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.invitation_gallery_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT 'General',
  image_url text NOT NULL,
  thumbnail_url text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.invitation_card_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  background_color text NOT NULL DEFAULT '#ffffff',
  background_image_url text,
  background_image_preview_url text,
  background_image_thumb_url text,
  background_image_width_px integer,
  background_image_height_px integer,
  background_image_type text NOT NULL DEFAULT 'none',
  background_image_x_position integer DEFAULT 50,
  background_image_y_position integer DEFAULT 50,
  background_image_opacity integer DEFAULT 100,
  text_zones jsonb NOT NULL DEFAULT '[]'::jsonb,
  font_color text NOT NULL DEFAULT '#000000',
  card_size text NOT NULL DEFAULT 'A5',
  orientation text NOT NULL DEFAULT 'portrait',
  card_type text NOT NULL DEFAULT 'invitation',
  name text NOT NULL DEFAULT 'Untitled',
  canva_template_url text,
  qr_config jsonb DEFAULT '{"enabled":false,"x_percent":50,"y_percent":90,"size_percent":15,"event_id":null}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.invitation_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.invitation_image_categories (
  image_id uuid PRIMARY KEY REFERENCES public.invitation_gallery_images(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.invitation_categories(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS invitation_card_settings_event_user_idx
  ON public.invitation_card_settings(event_id, user_id);
CREATE INDEX IF NOT EXISTS invitation_designs_event_idx ON public.invitation_designs(event_id);
CREATE INDEX IF NOT EXISTS invitation_designs_user_idx ON public.invitation_designs(user_id);
CREATE INDEX IF NOT EXISTS idx_iic_category ON public.invitation_image_categories(category_id);

ALTER TABLE public.invitation_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitation_designs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitation_gallery_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitation_card_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitation_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitation_image_categories ENABLE ROW LEVEL SECURITY;

-- Replace legacy user-id-only policies with event authorization checks.
DO $policies$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'invitation_templates', 'invitation_designs', 'invitation_gallery_images',
        'invitation_card_settings', 'invitation_categories', 'invitation_image_categories'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END
$policies$;

CREATE POLICY invitation_templates_public_read
  ON public.invitation_templates FOR SELECT
  TO anon, authenticated
  USING (is_active OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role));
CREATE POLICY invitation_templates_admin_write
  ON public.invitation_templates FOR ALL
  TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

CREATE POLICY invitation_designs_event_select
  ON public.invitation_designs FOR SELECT TO authenticated
  USING (public.can_access_event((SELECT auth.uid()), event_id));
CREATE POLICY invitation_designs_event_insert
  ON public.invitation_designs FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()) AND public.can_access_event((SELECT auth.uid()), event_id));
CREATE POLICY invitation_designs_event_update
  ON public.invitation_designs FOR UPDATE TO authenticated
  USING (public.can_access_event((SELECT auth.uid()), event_id))
  WITH CHECK (user_id = (SELECT auth.uid()) AND public.can_access_event((SELECT auth.uid()), event_id));
CREATE POLICY invitation_designs_event_delete
  ON public.invitation_designs FOR DELETE TO authenticated
  USING (public.can_access_event((SELECT auth.uid()), event_id));

CREATE POLICY invitation_card_settings_event_select
  ON public.invitation_card_settings FOR SELECT TO authenticated
  USING (public.can_access_event((SELECT auth.uid()), event_id));
CREATE POLICY invitation_card_settings_event_insert
  ON public.invitation_card_settings FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()) AND public.can_access_event((SELECT auth.uid()), event_id));
CREATE POLICY invitation_card_settings_event_update
  ON public.invitation_card_settings FOR UPDATE TO authenticated
  USING (public.can_access_event((SELECT auth.uid()), event_id))
  WITH CHECK (user_id = (SELECT auth.uid()) AND public.can_access_event((SELECT auth.uid()), event_id));
CREATE POLICY invitation_card_settings_event_delete
  ON public.invitation_card_settings FOR DELETE TO authenticated
  USING (public.can_access_event((SELECT auth.uid()), event_id));

CREATE POLICY invitation_gallery_public_read
  ON public.invitation_gallery_images FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY invitation_gallery_admin_write
  ON public.invitation_gallery_images FOR ALL TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));
CREATE POLICY invitation_categories_public_read
  ON public.invitation_categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY invitation_categories_admin_write
  ON public.invitation_categories FOR ALL TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));
CREATE POLICY invitation_image_categories_public_read
  ON public.invitation_image_categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY invitation_image_categories_admin_write
  ON public.invitation_image_categories FOR ALL TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

GRANT SELECT ON public.invitation_templates, public.invitation_gallery_images,
  public.invitation_categories, public.invitation_image_categories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.invitation_templates, public.invitation_gallery_images,
  public.invitation_categories, public.invitation_image_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invitation_designs,
  public.invitation_card_settings TO authenticated;

-- Public gallery art is intentional; organisers alone may mutate it.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('invitation-gallery', 'invitation-gallery', true, 524288000,
  ARRAY['image/jpeg','image/png','image/webp']::text[])
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- RSVP invitation assets are deliberately public because guest pages currently
-- store and render public URLs. Object mutation remains event-scoped.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('invitations', 'invitations', true, 524288000,
  ARRAY['application/pdf','image/jpeg','image/png']::text[])
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DO $storage_policies$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND (qual LIKE '%invitation-gallery%' OR with_check LIKE '%invitation-gallery%'
        OR qual LIKE '%invitations%' OR with_check LIKE '%invitations%')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', r.policyname);
  END LOOP;
END
$storage_policies$;

CREATE POLICY invitation_gallery_storage_public_read
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'invitation-gallery');
CREATE POLICY invitation_gallery_storage_admin_insert
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'invitation-gallery' AND public.has_role((SELECT auth.uid()), 'admin'::public.app_role));
CREATE POLICY invitation_gallery_storage_admin_update
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'invitation-gallery' AND public.has_role((SELECT auth.uid()), 'admin'::public.app_role))
  WITH CHECK (bucket_id = 'invitation-gallery' AND public.has_role((SELECT auth.uid()), 'admin'::public.app_role));
CREATE POLICY invitation_gallery_storage_admin_delete
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'invitation-gallery' AND public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

CREATE POLICY invitations_storage_public_read
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'invitations');
CREATE POLICY invitations_storage_event_insert
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'invitations'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
    AND public.can_access_event((SELECT auth.uid()), ((storage.foldername(name))[2])::uuid)
  );
CREATE POLICY invitations_storage_event_update
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'invitations'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
    AND public.can_access_event((SELECT auth.uid()), ((storage.foldername(name))[2])::uuid)
  )
  WITH CHECK (
    bucket_id = 'invitations'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
    AND public.can_access_event((SELECT auth.uid()), ((storage.foldername(name))[2])::uuid)
  );
CREATE POLICY invitations_storage_event_delete
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'invitations'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
    AND public.can_access_event((SELECT auth.uid()), ((storage.foldername(name))[2])::uuid)
  );

-- ---------------------------------------------------------------------------
-- Idempotent final-schema catch-up for Photo & Video Sharing, Gallery View,
-- Digital Guestbook, Digital Photo Booth and Live Slideshow.
-- ---------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

DO $types$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typnamespace = 'public'::regnamespace AND typname = 'event_media_kind') THEN
    CREATE TYPE public.event_media_kind AS ENUM ('photo', 'video', 'audio');
  ELSE
    ALTER TYPE public.event_media_kind ADD VALUE IF NOT EXISTS 'audio';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typnamespace = 'public'::regnamespace AND typname = 'event_media_upload_status') THEN
    CREATE TYPE public.event_media_upload_status AS ENUM ('pending', 'uploaded', 'failed');
  END IF;
END
$types$;

CREATE TABLE IF NOT EXISTS public.event_media_galleries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL UNIQUE REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  is_open boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  gallery_title text,
  welcome_message text,
  show_event_date boolean NOT NULL DEFAULT true,
  slideshow_photo_duration_sec integer NOT NULL DEFAULT 8,
  password_enabled boolean NOT NULL DEFAULT false,
  password_hash text,
  theme_color text,
  background_style text NOT NULL DEFAULT 'cream',
  cover_image_url text,
  logo_image_url text,
  show_branding boolean NOT NULL DEFAULT true,
  video_guestbook_enabled boolean NOT NULL DEFAULT false,
  photo_booth_enabled boolean NOT NULL DEFAULT false,
  photo_booth_mode text NOT NULL DEFAULT 'single',
  photo_booth_single_bottom_text text,
  photo_booth_single_logo_url text,
  photo_booth_single_template_url text,
  photo_booth_strip_bottom_text text,
  photo_booth_strip_logo_url text,
  photo_booth_strip_template_url text,
  slideshow_enabled boolean NOT NULL DEFAULT false,
  guest_upload_enabled boolean NOT NULL DEFAULT true,
  gallery_view_enabled boolean NOT NULL DEFAULT true,
  guestbook_text_enabled boolean NOT NULL DEFAULT true,
  slideshow_include_photos boolean NOT NULL DEFAULT true,
  slideshow_include_videos boolean NOT NULL DEFAULT true,
  slideshow_albums text[] NOT NULL DEFAULT '{}'::text[],
  slideshow_order text NOT NULL DEFAULT 'newest',
  slideshow_slide_duration_sec integer NOT NULL DEFAULT 5,
  slideshow_transition text NOT NULL DEFAULT 'fade',
  slideshow_show_caption boolean NOT NULL DEFAULT true,
  slideshow_loop boolean NOT NULL DEFAULT true,
  background_mode text NOT NULL DEFAULT 'preset',
  background_color text,
  background_image_url text,
  photo_booth_strip_style jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.event_media_upload_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gallery_id uuid NOT NULL REFERENCES public.event_media_galleries(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  expires_at timestamptz,
  max_uploads integer,
  uploads_used integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.event_media_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL UNIQUE REFERENCES public.events(id) ON DELETE CASCADE,
  max_photos integer NOT NULL DEFAULT 500,
  max_videos integer NOT NULL DEFAULT 50,
  max_total_bytes bigint NOT NULL DEFAULT 10737418240,
  max_video_bytes bigint NOT NULL DEFAULT 629145600,
  max_video_duration_sec integer NOT NULL DEFAULT 180,
  max_photo_bytes bigint NOT NULL DEFAULT 26214400,
  allowed_photo_mimes text[] NOT NULL DEFAULT ARRAY['image/jpeg','image/png','image/webp'],
  allowed_video_mimes text[] NOT NULL DEFAULT ARRAY['video/mp4','video/quicktime'],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.event_media_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  gallery_id uuid NOT NULL REFERENCES public.event_media_galleries(id) ON DELETE CASCADE,
  upload_token_id uuid REFERENCES public.event_media_upload_tokens(id) ON DELETE SET NULL,
  storage_path text NOT NULL UNIQUE,
  kind public.event_media_kind NOT NULL,
  mime_type text NOT NULL,
  byte_size bigint NOT NULL,
  duration_sec integer,
  uploader_name text,
  caption text,
  guestbook_message text,
  upload_status public.event_media_upload_status NOT NULL DEFAULT 'pending',
  upload_token_hash text,
  upload_token_expires_at timestamptz,
  upload_token_used_at timestamptz,
  uploaded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  moderation_status text NOT NULL DEFAULT 'approved',
  album text,
  is_guestbook boolean NOT NULL DEFAULT false,
  is_photo_booth boolean NOT NULL DEFAULT false,
  is_photo_booth_strip boolean NOT NULL DEFAULT false,
  like_count integer NOT NULL DEFAULT 0,
  source_category text NOT NULL DEFAULT 'guest_upload',
  share_photo_seq integer,
  share_video_seq integer,
  guestbook_recording_seq integer,
  photo_booth_seq integer,
  shared_to_gallery boolean NOT NULL DEFAULT false,
  CONSTRAINT event_media_items_album_check CHECK (album IS NULL OR album IN ('Wedding Day','Pre-Wedding','Post-Wedding','Other')),
  CONSTRAINT event_media_items_source_category_chk CHECK (source_category IN ('guest_upload','photo_booth','guestbook_recording'))
);

CREATE TABLE IF NOT EXISTS public.event_guestbook_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  gallery_id uuid NOT NULL REFERENCES public.event_media_galleries(id) ON DELETE CASCADE,
  uploader_name text,
  message text NOT NULL,
  moderation_status text NOT NULL DEFAULT 'approved',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  source_category text NOT NULL DEFAULT 'guestbook_text',
  guestbook_seq integer,
  CONSTRAINT event_guestbook_messages_source_category_chk CHECK (source_category = 'guestbook_text')
);

CREATE TABLE IF NOT EXISTS public.event_media_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.event_media_items(id) ON DELETE CASCADE,
  device_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (item_id, device_id)
);

CREATE TABLE IF NOT EXISTS public.event_media_seq_counters (
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  seq_kind text NOT NULL,
  last_value integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, seq_kind)
);

CREATE TABLE IF NOT EXISTS public.media_password_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key_hash text NOT NULL,
  scope text NOT NULL,
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  attempt_count integer NOT NULL DEFAULT 0,
  window_start timestamptz NOT NULL DEFAULT now(),
  blocked_until timestamptz,
  last_attempt_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (key_hash, scope)
);

CREATE TABLE IF NOT EXISTS public.photo_booth_background_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT 'General',
  colour text NOT NULL DEFAULT 'Multicolour',
  image_url text NOT NULL,
  thumbnail_url text NOT NULL,
  original_path text NOT NULL UNIQUE,
  thumbnail_path text NOT NULL UNIQUE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_emi_event_status ON public.event_media_items(event_id, upload_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_emi_gallery_status ON public.event_media_items(gallery_id, upload_status);
CREATE INDEX IF NOT EXISTS idx_event_media_items_event_moderation ON public.event_media_items(event_id, moderation_status, uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_media_items_event_source ON public.event_media_items(event_id, source_category, uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_emut_token ON public.event_media_upload_tokens(token);
CREATE INDEX IF NOT EXISTS idx_event_guestbook_messages_gallery ON public.event_guestbook_messages(gallery_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_media_likes_item ON public.event_media_likes(item_id);
CREATE INDEX IF NOT EXISTS media_password_rate_limits_cleanup_idx ON public.media_password_rate_limits(updated_at);
CREATE INDEX IF NOT EXISTS photo_booth_background_templates_sort_idx ON public.photo_booth_background_templates(sort_order, name);

ALTER TABLE public.event_media_galleries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_media_upload_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_media_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_media_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_guestbook_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_media_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_media_seq_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_password_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photo_booth_background_templates ENABLE ROW LEVEL SECURITY;

DO $media_policies$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename IN (
      'event_media_galleries','event_media_upload_tokens','event_media_limits','event_media_items',
      'event_guestbook_messages','event_media_likes','event_media_seq_counters',
      'media_password_rate_limits','photo_booth_background_templates'
    )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END
$media_policies$;

CREATE POLICY event_media_galleries_event_access ON public.event_media_galleries FOR ALL TO authenticated
  USING (public.can_access_event((SELECT auth.uid()), event_id))
  WITH CHECK (public.can_access_event((SELECT auth.uid()), event_id));
CREATE POLICY event_media_tokens_event_access ON public.event_media_upload_tokens FOR ALL TO authenticated
  USING (public.can_access_event((SELECT auth.uid()), event_id))
  WITH CHECK (public.can_access_event((SELECT auth.uid()), event_id));
CREATE POLICY event_media_limits_event_access ON public.event_media_limits FOR ALL TO authenticated
  USING (public.can_access_event((SELECT auth.uid()), event_id))
  WITH CHECK (public.can_access_event((SELECT auth.uid()), event_id));
CREATE POLICY event_media_items_event_access ON public.event_media_items FOR ALL TO authenticated
  USING (public.can_access_event((SELECT auth.uid()), event_id))
  WITH CHECK (public.can_access_event((SELECT auth.uid()), event_id));
CREATE POLICY event_guestbook_messages_event_access ON public.event_guestbook_messages FOR ALL TO authenticated
  USING (public.can_access_event((SELECT auth.uid()), event_id))
  WITH CHECK (public.can_access_event((SELECT auth.uid()), event_id));
CREATE POLICY event_media_likes_host_read ON public.event_media_likes FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.event_media_items i
    WHERE i.id = item_id AND public.can_access_event((SELECT auth.uid()), i.event_id)
  ));
CREATE POLICY photo_booth_templates_public_read ON public.photo_booth_background_templates
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY photo_booth_templates_admin_write ON public.photo_booth_background_templates
  FOR ALL TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

REVOKE ALL ON public.event_media_galleries, public.event_media_upload_tokens,
  public.event_media_limits, public.event_media_items, public.event_guestbook_messages,
  public.event_media_likes, public.event_media_seq_counters, public.media_password_rate_limits
  FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_media_galleries,
  public.event_media_upload_tokens, public.event_media_limits, public.event_media_items,
  public.event_guestbook_messages TO authenticated;
GRANT SELECT ON public.event_media_likes TO authenticated;
GRANT SELECT ON public.photo_booth_background_templates TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.photo_booth_background_templates TO authenticated;
GRANT ALL ON public.event_media_galleries, public.event_media_upload_tokens,
  public.event_media_limits, public.event_media_items, public.event_guestbook_messages,
  public.event_media_likes, public.event_media_seq_counters, public.media_password_rate_limits,
  public.photo_booth_background_templates TO service_role;

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('event-media', 'event-media', false, 629145600)
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = EXCLUDED.file_size_limit;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('event-media-branding', 'event-media-branding', true, 26214400,
  ARRAY['image/jpeg','image/png','image/webp']::text[])
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('photo-booth-templates', 'photo-booth-templates', true, 52428800,
  ARRAY['image/jpeg','image/png','image/webp']::text[])
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE OR REPLACE FUNCTION public._hash_upload_token(_raw text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public, extensions
AS $$ SELECT encode(extensions.digest(_raw, 'sha256'), 'hex') $$;

CREATE OR REPLACE FUNCTION public.is_pending_event_media_path(_path text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.event_media_items i
    WHERE i.storage_path = _path
      AND i.upload_status = 'pending'
      AND i.upload_token_used_at IS NULL
      AND i.upload_token_expires_at > now()
  )
$$;
REVOKE ALL ON FUNCTION public.is_pending_event_media_path(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_pending_event_media_path(text) TO anon, authenticated;

DO $storage_media_policies$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND (qual LIKE '%event-media%' OR with_check LIKE '%event-media%'
        OR qual LIKE '%photo-booth-templates%' OR with_check LIKE '%photo-booth-templates%')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', r.policyname);
  END LOOP;
END
$storage_media_policies$;

CREATE POLICY event_media_host_read ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'event-media' AND EXISTS (
    SELECT 1 FROM public.event_media_items i
    WHERE i.storage_path = name
      AND public.can_access_event((SELECT auth.uid()), i.event_id)
  )
);
CREATE POLICY event_media_host_delete ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'event-media' AND EXISTS (
    SELECT 1 FROM public.event_media_items i
    WHERE i.storage_path = name
      AND public.can_access_event((SELECT auth.uid()), i.event_id)
  )
);
CREATE POLICY event_media_pending_insert ON storage.objects FOR INSERT TO anon, authenticated
WITH CHECK (bucket_id = 'event-media' AND public.is_pending_event_media_path(name));

CREATE POLICY event_media_branding_public_read ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'event-media-branding');
CREATE POLICY event_media_branding_event_insert ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'event-media-branding'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  AND public.can_access_event((SELECT auth.uid()), ((storage.foldername(name))[2])::uuid)
);
CREATE POLICY event_media_branding_event_update ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'event-media-branding'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  AND public.can_access_event((SELECT auth.uid()), ((storage.foldername(name))[2])::uuid)
)
WITH CHECK (
  bucket_id = 'event-media-branding'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  AND public.can_access_event((SELECT auth.uid()), ((storage.foldername(name))[2])::uuid)
);
CREATE POLICY event_media_branding_event_delete ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'event-media-branding'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  AND public.can_access_event((SELECT auth.uid()), ((storage.foldername(name))[2])::uuid)
);

CREATE POLICY photo_booth_templates_public_read ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'photo-booth-templates');
CREATE POLICY photo_booth_templates_admin_insert ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'photo-booth-templates' AND public.has_role((SELECT auth.uid()), 'admin'::public.app_role));
CREATE POLICY photo_booth_templates_admin_update ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'photo-booth-templates' AND public.has_role((SELECT auth.uid()), 'admin'::public.app_role))
WITH CHECK (bucket_id = 'photo-booth-templates' AND public.has_role((SELECT auth.uid()), 'admin'::public.app_role));
CREATE POLICY photo_booth_templates_admin_delete ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'photo-booth-templates' AND public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

CREATE OR REPLACE FUNCTION public.ensure_event_media_gallery(_event_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions
AS $$
DECLARE _gid uuid; _owner uuid;
BEGIN
  IF NOT public.can_access_event(auth.uid(), _event_id) THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  SELECT user_id INTO _owner FROM public.events WHERE id = _event_id;
  IF _owner IS NULL THEN RAISE EXCEPTION 'Event not found'; END IF;
  INSERT INTO public.event_media_galleries(event_id, user_id)
  VALUES (_event_id, _owner) ON CONFLICT (event_id) DO NOTHING;
  SELECT id INTO _gid FROM public.event_media_galleries WHERE event_id = _event_id;
  INSERT INTO public.event_media_limits(event_id) VALUES (_event_id) ON CONFLICT (event_id) DO NOTHING;
  INSERT INTO public.event_media_upload_tokens(gallery_id, event_id, token)
  SELECT _gid, _event_id, replace(replace(encode(extensions.gen_random_bytes(24), 'base64'), '/', '_'), '+', '-')
  WHERE NOT EXISTS (SELECT 1 FROM public.event_media_upload_tokens WHERE gallery_id = _gid);
  RETURN _gid;
END
$$;

CREATE OR REPLACE FUNCTION public.get_event_media_gallery_host(_event_id uuid)
RETURNS TABLE(
  gallery_id uuid, is_open boolean, primary_token text, max_photos integer, max_videos integer,
  max_total_bytes bigint, max_video_bytes bigint, max_video_duration_sec integer, max_photo_bytes bigint,
  gallery_title text, welcome_message text, show_event_date boolean, slideshow_photo_duration_sec integer,
  password_enabled boolean, has_password boolean, theme_color text, background_style text,
  cover_image_url text, logo_image_url text, show_branding boolean, background_mode text,
  background_color text, background_image_url text, video_guestbook_enabled boolean,
  photo_booth_enabled boolean, photo_booth_mode text, photo_booth_single_bottom_text text,
  photo_booth_single_logo_url text, photo_booth_single_template_url text,
  photo_booth_strip_bottom_text text, photo_booth_strip_logo_url text,
  photo_booth_strip_template_url text, photo_booth_strip_style jsonb, slideshow_enabled boolean,
  guest_upload_enabled boolean, gallery_view_enabled boolean, guestbook_text_enabled boolean,
  slideshow_include_photos boolean, slideshow_include_videos boolean, slideshow_albums text[],
  slideshow_order text, slideshow_slide_duration_sec integer, slideshow_transition text,
  slideshow_show_caption boolean, slideshow_loop boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT g.id, g.is_open,
    (SELECT t.token FROM public.event_media_upload_tokens t WHERE t.gallery_id = g.id ORDER BY t.created_at LIMIT 1),
    l.max_photos, l.max_videos, l.max_total_bytes, l.max_video_bytes, l.max_video_duration_sec, l.max_photo_bytes,
    g.gallery_title, g.welcome_message, g.show_event_date, g.slideshow_photo_duration_sec,
    g.password_enabled, g.password_hash IS NOT NULL, g.theme_color, g.background_style,
    g.cover_image_url, g.logo_image_url, g.show_branding, g.background_mode,
    g.background_color, g.background_image_url, g.video_guestbook_enabled,
    g.photo_booth_enabled, g.photo_booth_mode, g.photo_booth_single_bottom_text,
    g.photo_booth_single_logo_url, g.photo_booth_single_template_url,
    g.photo_booth_strip_bottom_text, g.photo_booth_strip_logo_url,
    g.photo_booth_strip_template_url, g.photo_booth_strip_style, g.slideshow_enabled,
    g.guest_upload_enabled, g.gallery_view_enabled, g.guestbook_text_enabled,
    g.slideshow_include_photos, g.slideshow_include_videos, g.slideshow_albums,
    g.slideshow_order, g.slideshow_slide_duration_sec, g.slideshow_transition,
    g.slideshow_show_caption, g.slideshow_loop
  FROM public.event_media_galleries g
  LEFT JOIN public.event_media_limits l ON l.event_id = g.event_id
  WHERE g.event_id = _event_id AND public.can_access_event(auth.uid(), g.event_id)
$$;

CREATE OR REPLACE FUNCTION public.get_event_media_gallery_public(_token text)
RETURNS TABLE(
  gallery_id uuid, event_id uuid, event_name text, event_date date, is_open boolean,
  partner1_name text, partner2_name text, max_photos integer, max_videos integer,
  max_video_bytes bigint, max_video_duration_sec integer, max_photo_bytes bigint,
  allowed_photo_mimes text[], allowed_video_mimes text[], gallery_title text,
  welcome_message text, show_event_date boolean, slideshow_photo_duration_sec integer,
  password_required boolean, theme_color text, background_style text, cover_image_url text,
  logo_image_url text, show_branding boolean, background_mode text, background_color text,
  background_image_url text, video_guestbook_enabled boolean, photo_booth_enabled boolean,
  photo_booth_mode text, photo_booth_single_bottom_text text, photo_booth_single_logo_url text,
  photo_booth_single_template_url text, photo_booth_strip_bottom_text text,
  photo_booth_strip_logo_url text, photo_booth_strip_template_url text,
  photo_booth_strip_style jsonb, slideshow_enabled boolean, guest_upload_enabled boolean,
  gallery_view_enabled boolean, guestbook_text_enabled boolean, slideshow_include_photos boolean,
  slideshow_include_videos boolean, slideshow_albums text[], slideshow_order text,
  slideshow_slide_duration_sec integer, slideshow_transition text, slideshow_show_caption boolean,
  slideshow_loop boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT g.id, e.id, e.name, e.date, g.is_open, e.partner1_name, e.partner2_name,
    l.max_photos, l.max_videos, l.max_video_bytes, l.max_video_duration_sec, l.max_photo_bytes,
    l.allowed_photo_mimes, l.allowed_video_mimes, g.gallery_title, g.welcome_message,
    g.show_event_date, g.slideshow_photo_duration_sec, g.password_enabled, g.theme_color,
    g.background_style, g.cover_image_url, g.logo_image_url, g.show_branding, g.background_mode,
    g.background_color, g.background_image_url, g.video_guestbook_enabled, g.photo_booth_enabled,
    g.photo_booth_mode, g.photo_booth_single_bottom_text, g.photo_booth_single_logo_url,
    g.photo_booth_single_template_url, g.photo_booth_strip_bottom_text, g.photo_booth_strip_logo_url,
    g.photo_booth_strip_template_url, g.photo_booth_strip_style, g.slideshow_enabled,
    g.guest_upload_enabled, g.gallery_view_enabled, g.guestbook_text_enabled,
    g.slideshow_include_photos, g.slideshow_include_videos, g.slideshow_albums,
    g.slideshow_order, g.slideshow_slide_duration_sec, g.slideshow_transition,
    g.slideshow_show_caption, g.slideshow_loop
  FROM public.event_media_upload_tokens t
  JOIN public.event_media_galleries g ON g.id = t.gallery_id
  JOIN public.events e ON e.id = g.event_id
  LEFT JOIN public.event_media_limits l ON l.event_id = g.event_id
  WHERE t.token = _token AND (t.expires_at IS NULL OR t.expires_at > now())
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.next_event_media_seq(_event_id uuid, _seq_kind text)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _next integer;
BEGIN
  IF _seq_kind NOT IN ('share_photo','share_video','guestbook_recording','guestbook_text','photo_booth') THEN
    RAISE EXCEPTION 'Invalid sequence kind';
  END IF;
  INSERT INTO public.event_media_seq_counters(event_id, seq_kind, last_value)
  VALUES (_event_id, _seq_kind, 1)
  ON CONFLICT (event_id, seq_kind) DO UPDATE
    SET last_value = event_media_seq_counters.last_value + 1, updated_at = now()
  RETURNING last_value INTO _next;
  RETURN _next;
END
$$;
REVOKE ALL ON FUNCTION public.next_event_media_seq(uuid,text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.register_event_media_upload(
  _token text, _kind public.event_media_kind, _mime_type text, _byte_size bigint,
  _duration_sec integer, _uploader_name text, _caption text, _guestbook_message text,
  _filename text, _album text DEFAULT NULL
)
RETURNS TABLE(item_id uuid, storage_path text, upload_token text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions
AS $$
DECLARE
  _tok public.event_media_upload_tokens%ROWTYPE;
  _gal public.event_media_galleries%ROWTYPE;
  _lim public.event_media_limits%ROWTYPE;
  _photo_count integer; _video_count integer; _total_bytes bigint;
  _id uuid := gen_random_uuid(); _path text; _raw text; _ext text; _safe_album text;
BEGIN
  SELECT * INTO _tok FROM public.event_media_upload_tokens WHERE token = _token FOR UPDATE;
  IF NOT FOUND OR (_tok.expires_at IS NOT NULL AND _tok.expires_at <= now()) THEN RAISE EXCEPTION 'Invalid or expired upload token'; END IF;
  IF _tok.max_uploads IS NOT NULL AND _tok.uploads_used >= _tok.max_uploads THEN RAISE EXCEPTION 'Upload quota reached'; END IF;
  SELECT * INTO _gal FROM public.event_media_galleries WHERE id = _tok.gallery_id;
  IF NOT _gal.is_open OR NOT _gal.guest_upload_enabled THEN RAISE EXCEPTION 'Gallery uploads are closed'; END IF;
  SELECT * INTO _lim FROM public.event_media_limits WHERE event_id = _tok.event_id;
  IF NOT FOUND THEN
    INSERT INTO public.event_media_limits(event_id) VALUES (_tok.event_id) RETURNING * INTO _lim;
  END IF;
  IF _byte_size <= 0 THEN RAISE EXCEPTION 'Invalid file size'; END IF;
  IF _kind = 'photo' THEN
    IF NOT (_mime_type = ANY(_lim.allowed_photo_mimes)) OR _byte_size > _lim.max_photo_bytes THEN RAISE EXCEPTION 'Photo type or size not allowed'; END IF;
  ELSIF _kind = 'video' THEN
    IF NOT (_mime_type = ANY(_lim.allowed_video_mimes)) OR _byte_size > _lim.max_video_bytes
      OR _duration_sec IS NULL OR _duration_sec > _lim.max_video_duration_sec THEN RAISE EXCEPTION 'Video type, size or duration not allowed'; END IF;
  ELSE
    IF _mime_type NOT IN ('audio/webm','audio/mp4','audio/mpeg','audio/wav','audio/x-wav')
      OR _byte_size > _lim.max_video_bytes OR _duration_sec IS NULL
      OR _duration_sec > _lim.max_video_duration_sec THEN RAISE EXCEPTION 'Audio type, size or duration not allowed'; END IF;
  END IF;
  SELECT count(*) FILTER (WHERE kind='photo' AND upload_status IN ('pending','uploaded')),
    count(*) FILTER (WHERE kind='video' AND upload_status IN ('pending','uploaded')),
    COALESCE(sum(byte_size) FILTER (WHERE upload_status IN ('pending','uploaded')),0)
  INTO _photo_count, _video_count, _total_bytes FROM public.event_media_items WHERE event_id = _tok.event_id;
  IF _kind='photo' AND _photo_count >= _lim.max_photos THEN RAISE EXCEPTION 'Photo limit reached'; END IF;
  IF _kind='video' AND _video_count >= _lim.max_videos THEN RAISE EXCEPTION 'Video limit reached'; END IF;
  IF _total_bytes + _byte_size > _lim.max_total_bytes THEN RAISE EXCEPTION 'Storage limit reached'; END IF;
  _safe_album := CASE WHEN _album IN ('Wedding Day','Pre-Wedding','Post-Wedding','Other') THEN _album ELSE 'Other' END;
  -- Never use a caller-supplied filename as part of the object path. The
  -- already validated MIME type is the sole source of the canonical suffix.
  _ext := CASE _mime_type WHEN 'image/jpeg' THEN 'jpg' WHEN 'image/png' THEN 'png'
    WHEN 'image/webp' THEN 'webp' WHEN 'video/mp4' THEN 'mp4' WHEN 'video/quicktime' THEN 'mov'
    WHEN 'audio/webm' THEN 'webm' WHEN 'audio/mp4' THEN 'm4a' WHEN 'audio/mpeg' THEN 'mp3'
    WHEN 'audio/wav' THEN 'wav' WHEN 'audio/x-wav' THEN 'wav' ELSE 'bin' END;
  _path := _tok.event_id::text || '/' || _id::text || '.' || _ext;
  _raw := encode(extensions.gen_random_bytes(32),'hex');
  INSERT INTO public.event_media_items(
    id,event_id,gallery_id,upload_token_id,storage_path,kind,mime_type,byte_size,duration_sec,
    uploader_name,caption,guestbook_message,album,upload_token_hash,upload_token_expires_at
  ) VALUES (
    _id,_tok.event_id,_tok.gallery_id,_tok.id,_path,_kind,_mime_type,_byte_size,_duration_sec,
    NULLIF(trim(_uploader_name),''),NULLIF(trim(_caption),''),NULLIF(trim(_guestbook_message),''),
    _safe_album,public._hash_upload_token(_raw),now()+interval '15 minutes'
  );
  RETURN QUERY SELECT _id, _path, _raw;
END
$$;

CREATE OR REPLACE FUNCTION public.register_event_guestbook_upload(
  _token text, _kind public.event_media_kind, _mime_type text, _byte_size bigint,
  _duration_sec integer, _uploader_name text, _message text, _filename text
)
RETURNS TABLE(item_id uuid, storage_path text, upload_token text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _row record; _event_id uuid; _enabled boolean;
BEGIN
  SELECT g.event_id, g.video_guestbook_enabled INTO _event_id, _enabled
  FROM public.event_media_upload_tokens t JOIN public.event_media_galleries g ON g.id=t.gallery_id
  WHERE t.token=_token AND (t.expires_at IS NULL OR t.expires_at>now());
  IF NOT COALESCE(_enabled,false) THEN RAISE EXCEPTION 'Guestbook recording is disabled'; END IF;
  SELECT * INTO _row FROM public.register_event_media_upload(
    _token,_kind,_mime_type,_byte_size,_duration_sec,_uploader_name,NULL,_message,_filename,NULL
  );
  UPDATE public.event_media_items SET
    is_guestbook=true, source_category='guestbook_recording', album=NULL,
    guestbook_recording_seq=public.next_event_media_seq(_event_id,'guestbook_recording')
  WHERE id=_row.item_id;
  RETURN QUERY SELECT _row.item_id, _row.storage_path, _row.upload_token;
END
$$;

CREATE OR REPLACE FUNCTION public.register_event_photobooth_upload(
  _token text, _mime_type text, _byte_size bigint, _uploader_name text,
  _filename text, _is_strip boolean DEFAULT false
)
RETURNS TABLE(item_id uuid, storage_path text, upload_token text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _row record; _event_id uuid; _enabled boolean;
BEGIN
  SELECT g.event_id, g.photo_booth_enabled INTO _event_id, _enabled
  FROM public.event_media_upload_tokens t JOIN public.event_media_galleries g ON g.id=t.gallery_id
  WHERE t.token=_token AND (t.expires_at IS NULL OR t.expires_at>now());
  IF NOT COALESCE(_enabled,false) THEN RAISE EXCEPTION 'Photo booth is disabled'; END IF;
  SELECT * INTO _row FROM public.register_event_media_upload(
    _token,'photo',_mime_type,_byte_size,NULL,_uploader_name,NULL,NULL,_filename,NULL
  );
  UPDATE public.event_media_items SET
    is_photo_booth=true, is_photo_booth_strip=COALESCE(_is_strip,false),
    source_category='photo_booth', album=NULL,
    photo_booth_seq=public.next_event_media_seq(_event_id,'photo_booth')
  WHERE id=_row.item_id;
  RETURN QUERY SELECT _row.item_id, _row.storage_path, _row.upload_token;
END
$$;

CREATE OR REPLACE FUNCTION public.finalize_event_media_upload(_item_id uuid, _upload_token text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _token_id uuid;
BEGIN
  UPDATE public.event_media_items SET upload_status='uploaded', uploaded_at=now(), upload_token_used_at=now()
  WHERE id=_item_id AND upload_status='pending' AND upload_token_used_at IS NULL
    AND upload_token_expires_at>now() AND upload_token_hash=public._hash_upload_token(_upload_token)
  RETURNING upload_token_id INTO _token_id;
  IF NOT FOUND THEN RETURN false; END IF;
  IF _token_id IS NOT NULL THEN UPDATE public.event_media_upload_tokens SET uploads_used=uploads_used+1 WHERE id=_token_id; END IF;
  RETURN true;
END
$$;

CREATE OR REPLACE FUNCTION public.fail_event_media_upload(_item_id uuid, _upload_token text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.event_media_items SET upload_status='failed',upload_token_used_at=COALESCE(upload_token_used_at,now())
  WHERE id=_item_id AND upload_status='pending' AND upload_token_hash=public._hash_upload_token(_upload_token);
  RETURN FOUND;
END
$$;

CREATE OR REPLACE FUNCTION public.get_event_media_items_host(_event_id uuid)
RETURNS TABLE(
  id uuid, kind public.event_media_kind, mime_type text, byte_size bigint, duration_sec integer,
  storage_path text, uploader_name text, caption text, guestbook_message text, uploaded_at timestamptz,
  moderation_status text, album text, is_guestbook boolean, is_photo_booth boolean,
  is_photo_booth_strip boolean, like_count integer, source_category text, share_photo_seq integer,
  share_video_seq integer, guestbook_recording_seq integer, photo_booth_seq integer, shared_to_gallery boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT i.id,i.kind,i.mime_type,i.byte_size,i.duration_sec,i.storage_path,i.uploader_name,
    i.caption,i.guestbook_message,i.uploaded_at,i.moderation_status,i.album,i.is_guestbook,
    i.is_photo_booth,i.is_photo_booth_strip,i.like_count,i.source_category,i.share_photo_seq,
    i.share_video_seq,i.guestbook_recording_seq,i.photo_booth_seq,i.shared_to_gallery
  FROM public.event_media_items i
  WHERE i.event_id=_event_id AND public.can_access_event(auth.uid(),i.event_id) AND i.upload_status='uploaded'
  ORDER BY i.uploaded_at DESC NULLS LAST,i.created_at DESC
$$;

CREATE OR REPLACE FUNCTION public.get_event_media_items_public(_token text)
RETURNS TABLE(
  id uuid, kind public.event_media_kind, mime_type text, storage_path text, duration_sec integer,
  uploader_name text, caption text, uploaded_at timestamptz, like_count integer, album text,
  share_photo_seq integer, share_video_seq integer, source_category text,
  is_photo_booth_strip boolean, photo_booth_seq integer
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT i.id,i.kind,i.mime_type,i.storage_path,i.duration_sec,i.uploader_name,i.caption,
    i.uploaded_at,i.like_count,i.album,i.share_photo_seq,i.share_video_seq,i.source_category,
    i.is_photo_booth_strip,i.photo_booth_seq
  FROM public.event_media_upload_tokens t
  JOIN public.event_media_galleries g ON g.id=t.gallery_id
  JOIN public.event_media_items i ON i.gallery_id=g.id
  WHERE t.token=_token AND (t.expires_at IS NULL OR t.expires_at>now()) AND g.is_open
    AND i.upload_status='uploaded' AND i.moderation_status='approved'
    AND ((i.source_category IN ('guest_upload','photo_booth') AND NOT i.is_guestbook AND i.kind IN ('photo','video'))
      OR (i.source_category='guestbook_recording' AND i.shared_to_gallery))
  ORDER BY i.uploaded_at,i.created_at
$$;

CREATE OR REPLACE FUNCTION public.get_event_media_gallery_usage_public(_token text)
RETURNS TABLE(photos_used integer,videos_used integer,bytes_used bigint,max_photos integer,max_videos integer,max_total_bytes bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT count(i.id) FILTER (WHERE i.kind='photo' AND i.source_category<>'guestbook_recording')::integer,
    count(i.id) FILTER (WHERE i.kind='video' AND i.source_category<>'guestbook_recording')::integer,
    COALESCE(sum(i.byte_size),0)::bigint,l.max_photos,l.max_videos,l.max_total_bytes
  FROM public.event_media_upload_tokens t JOIN public.event_media_galleries g ON g.id=t.gallery_id
  LEFT JOIN public.event_media_limits l ON l.event_id=g.event_id
  LEFT JOIN public.event_media_items i ON i.event_id=g.event_id AND i.upload_status='uploaded'
  WHERE t.token=_token AND (t.expires_at IS NULL OR t.expires_at>now())
  GROUP BY l.max_photos,l.max_videos,l.max_total_bytes LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public._assert_event_media_access(_event_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ BEGIN IF NOT public.can_access_event(auth.uid(),_event_id) THEN RAISE EXCEPTION 'Unauthorized'; END IF; END $$;
REVOKE ALL ON FUNCTION public._assert_event_media_access(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.set_event_media_gallery_open(_event_id uuid,_is_open boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN PERFORM public._assert_event_media_access(_event_id); UPDATE public.event_media_galleries SET is_open=_is_open,updated_at=now() WHERE event_id=_event_id; RETURN FOUND; END $$;

CREATE OR REPLACE FUNCTION public.update_event_media_limits(
  _event_id uuid,_max_photos integer,_max_videos integer,_max_total_bytes bigint,
  _max_video_bytes bigint,_max_video_duration_sec integer,_max_photo_bytes bigint
)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  PERFORM public._assert_event_media_access(_event_id);
  INSERT INTO public.event_media_limits(event_id) VALUES(_event_id) ON CONFLICT(event_id) DO NOTHING;
  UPDATE public.event_media_limits SET max_photos=COALESCE(_max_photos,max_photos),
    max_videos=COALESCE(_max_videos,max_videos),max_total_bytes=COALESCE(_max_total_bytes,max_total_bytes),
    max_video_bytes=COALESCE(_max_video_bytes,max_video_bytes),
    max_video_duration_sec=COALESCE(_max_video_duration_sec,max_video_duration_sec),
    max_photo_bytes=COALESCE(_max_photo_bytes,max_photo_bytes),updated_at=now() WHERE event_id=_event_id;
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.update_event_media_display_settings(
  _event_id uuid,_gallery_title text,_welcome_message text,_show_event_date boolean,_slideshow_photo_duration_sec integer
)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  PERFORM public._assert_event_media_access(_event_id);
  UPDATE public.event_media_galleries SET gallery_title=NULLIF(trim(_gallery_title),''),
    welcome_message=NULLIF(trim(_welcome_message),''),show_event_date=COALESCE(_show_event_date,true),
    slideshow_photo_duration_sec=greatest(3,least(60,COALESCE(_slideshow_photo_duration_sec,8))),updated_at=now()
  WHERE event_id=_event_id;
  RETURN FOUND;
END $$;

CREATE OR REPLACE FUNCTION public.update_event_media_branding(
  _event_id uuid,_theme_color text,_background_style text,_cover_image_url text,
  _logo_image_url text,_show_branding boolean,_background_mode text DEFAULT 'preset',
  _background_color text DEFAULT NULL,_background_image_url text DEFAULT NULL
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  PERFORM public._assert_event_media_access(_event_id);
  IF COALESCE(_background_style,'cream') NOT IN ('light','dark','cream') THEN RAISE EXCEPTION 'Invalid background style'; END IF;
  IF COALESCE(_background_mode,'preset') NOT IN ('preset','colour','image') THEN RAISE EXCEPTION 'Invalid background mode'; END IF;
  UPDATE public.event_media_galleries SET theme_color=_theme_color,background_style=COALESCE(_background_style,'cream'),
    cover_image_url=_cover_image_url,logo_image_url=_logo_image_url,show_branding=COALESCE(_show_branding,true),
    background_mode=COALESCE(_background_mode,'preset'),background_color=_background_color,
    background_image_url=_background_image_url,updated_at=now() WHERE event_id=_event_id;
END $$;

CREATE OR REPLACE FUNCTION public.set_event_media_guest_feature(_event_id uuid,_feature text,_enabled boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  PERFORM public._assert_event_media_access(_event_id);
  IF _feature='guest_upload_enabled' THEN UPDATE public.event_media_galleries SET guest_upload_enabled=_enabled,updated_at=now() WHERE event_id=_event_id;
  ELSIF _feature='gallery_view_enabled' THEN UPDATE public.event_media_galleries SET gallery_view_enabled=_enabled,updated_at=now() WHERE event_id=_event_id;
  ELSIF _feature='guestbook_text_enabled' THEN UPDATE public.event_media_galleries SET guestbook_text_enabled=_enabled,updated_at=now() WHERE event_id=_event_id;
  ELSE RAISE EXCEPTION 'Invalid guest feature'; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.set_event_media_video_guestbook(_event_id uuid,_enabled boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN PERFORM public._assert_event_media_access(_event_id); UPDATE public.event_media_galleries SET video_guestbook_enabled=_enabled,updated_at=now() WHERE event_id=_event_id; END $$;
CREATE OR REPLACE FUNCTION public.set_event_media_photo_booth(_event_id uuid,_enabled boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN PERFORM public._assert_event_media_access(_event_id); UPDATE public.event_media_galleries SET photo_booth_enabled=_enabled,updated_at=now() WHERE event_id=_event_id; END $$;
CREATE OR REPLACE FUNCTION public.set_event_media_slideshow(_event_id uuid,_enabled boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN PERFORM public._assert_event_media_access(_event_id); UPDATE public.event_media_galleries SET slideshow_enabled=_enabled,updated_at=now() WHERE event_id=_event_id; END $$;

CREATE OR REPLACE FUNCTION public.set_event_media_photo_booth_mode(_event_id uuid,_mode text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  PERFORM public._assert_event_media_access(_event_id);
  IF _mode NOT IN ('single','strip') THEN RAISE EXCEPTION 'Invalid photo booth mode'; END IF;
  UPDATE public.event_media_galleries SET photo_booth_mode=_mode,updated_at=now() WHERE event_id=_event_id;
END $$;

DROP FUNCTION IF EXISTS public.update_event_media_photo_booth_template(uuid,text,text,text,text);
CREATE OR REPLACE FUNCTION public.update_event_media_photo_booth_template(
  _event_id uuid,_kind text,_bottom_text text,_logo_url text,_template_url text,_style jsonb DEFAULT NULL
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  PERFORM public._assert_event_media_access(_event_id);
  IF _kind='single' THEN UPDATE public.event_media_galleries SET photo_booth_single_bottom_text=_bottom_text,
    photo_booth_single_logo_url=_logo_url,photo_booth_single_template_url=_template_url,updated_at=now() WHERE event_id=_event_id;
  ELSIF _kind='strip' THEN UPDATE public.event_media_galleries SET photo_booth_strip_bottom_text=_bottom_text,
    photo_booth_strip_logo_url=_logo_url,photo_booth_strip_template_url=_template_url,
    photo_booth_strip_style=COALESCE(_style,'{}'::jsonb),updated_at=now() WHERE event_id=_event_id;
  ELSE RAISE EXCEPTION 'Invalid template kind'; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.update_event_media_slideshow_settings(
  _event_id uuid,_include_photos boolean,_include_videos boolean,_albums text[],_order text,
  _slide_duration_sec integer,_transition text,_show_caption boolean,_loop boolean
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  PERFORM public._assert_event_media_access(_event_id);
  IF _order NOT IN ('newest','oldest','random') THEN RAISE EXCEPTION 'Invalid slideshow order'; END IF;
  IF _transition NOT IN ('fade','slide','none') THEN RAISE EXCEPTION 'Invalid slideshow transition'; END IF;
  UPDATE public.event_media_galleries SET slideshow_include_photos=_include_photos,
    slideshow_include_videos=_include_videos,slideshow_albums=COALESCE(_albums,'{}'::text[]),
    slideshow_order=_order,slideshow_slide_duration_sec=greatest(3,least(60,_slide_duration_sec)),
    slideshow_transition=_transition,slideshow_show_caption=_show_caption,slideshow_loop=_loop,updated_at=now()
  WHERE event_id=_event_id;
END $$;

CREATE OR REPLACE FUNCTION public.set_event_media_moderation(_item_id uuid,_status text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _event_id uuid; BEGIN
  IF _status NOT IN ('approved','hidden') THEN RAISE EXCEPTION 'Invalid moderation status'; END IF;
  SELECT event_id INTO _event_id FROM public.event_media_items WHERE id=_item_id;
  PERFORM public._assert_event_media_access(_event_id);
  UPDATE public.event_media_items SET moderation_status=_status WHERE id=_item_id;
END $$;

CREATE OR REPLACE FUNCTION public.set_event_media_album(_item_id uuid,_album text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _event_id uuid; _safe text; BEGIN
  SELECT event_id INTO _event_id FROM public.event_media_items WHERE id=_item_id;
  PERFORM public._assert_event_media_access(_event_id);
  _safe:=CASE WHEN _album IS NULL THEN NULL WHEN _album IN ('Wedding Day','Pre-Wedding','Post-Wedding','Other') THEN _album
    WHEN _album IN ('Ceremony','Reception','Dance Floor') THEN 'Other' ELSE NULL END;
  IF _album IS NOT NULL AND _safe IS NULL THEN RAISE EXCEPTION 'Invalid album'; END IF;
  UPDATE public.event_media_items SET album=_safe WHERE id=_item_id;
END $$;

CREATE OR REPLACE FUNCTION public.set_event_media_albums(_item_ids uuid[],_album text)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _id uuid; _count integer:=0; BEGIN
  FOREACH _id IN ARRAY _item_ids LOOP PERFORM public.set_event_media_album(_id,_album); _count:=_count+1; END LOOP;
  RETURN _count;
END $$;

CREATE OR REPLACE FUNCTION public.set_event_media_guestbook_share(_item_id uuid,_shared boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _event_id uuid; BEGIN
  SELECT event_id INTO _event_id FROM public.event_media_items WHERE id=_item_id AND source_category='guestbook_recording';
  PERFORM public._assert_event_media_access(_event_id);
  UPDATE public.event_media_items SET shared_to_gallery=_shared WHERE id=_item_id;
END $$;

CREATE OR REPLACE FUNCTION public.set_event_media_password(_event_id uuid,_enabled boolean,_password text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
BEGIN
  PERFORM public._assert_event_media_access(_event_id);
  IF _enabled AND length(COALESCE(_password,''))<4 THEN RAISE EXCEPTION 'Password must contain at least 4 characters'; END IF;
  UPDATE public.event_media_galleries SET password_enabled=_enabled,
    password_hash=CASE WHEN _enabled THEN extensions.crypt(_password,extensions.gen_salt('bf',10)) ELSE NULL END,
    updated_at=now() WHERE event_id=_event_id;
  RETURN FOUND;
END $$;

CREATE OR REPLACE FUNCTION public.verify_event_media_password(_token text,_password text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,extensions AS $$
  SELECT COALESCE(NOT g.password_enabled OR g.password_hash=extensions.crypt(_password,g.password_hash),false)
  FROM public.event_media_upload_tokens t JOIN public.event_media_galleries g ON g.id=t.gallery_id
  WHERE t.token=_token AND (t.expires_at IS NULL OR t.expires_at>now()) LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.submit_event_guestbook_text(_token text,_uploader_name text,_message text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _gallery public.event_media_galleries%ROWTYPE; _id uuid; BEGIN
  SELECT g.* INTO _gallery FROM public.event_media_upload_tokens t
  JOIN public.event_media_galleries g ON g.id=t.gallery_id
  WHERE t.token=_token AND (t.expires_at IS NULL OR t.expires_at>now());
  IF NOT FOUND OR NOT _gallery.is_open OR NOT _gallery.guestbook_text_enabled THEN RAISE EXCEPTION 'Guestbook is unavailable'; END IF;
  IF length(trim(COALESCE(_uploader_name,'')))<1 OR length(trim(COALESCE(_message,'')))<1 OR length(_message)>4000 THEN RAISE EXCEPTION 'Name and message are required'; END IF;
  INSERT INTO public.event_guestbook_messages(event_id,gallery_id,uploader_name,message,guestbook_seq)
  VALUES(_gallery.event_id,_gallery.id,trim(_uploader_name),trim(_message),public.next_event_media_seq(_gallery.event_id,'guestbook_text'))
  RETURNING id INTO _id; RETURN _id;
END $$;

CREATE OR REPLACE FUNCTION public.update_event_guestbook_text(_token text,_id uuid,_uploader_name text,_message text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF length(trim(COALESCE(_uploader_name,'')))<1 OR length(trim(COALESCE(_message,'')))<1 OR length(_message)>4000 THEN RAISE EXCEPTION 'Name and message are required'; END IF;
  UPDATE public.event_guestbook_messages m SET uploader_name=trim(_uploader_name),message=trim(_message),updated_at=now()
  FROM public.event_media_upload_tokens t
  WHERE m.id=_id AND t.token=_token AND t.gallery_id=m.gallery_id AND (t.expires_at IS NULL OR t.expires_at>now());
  IF NOT FOUND THEN RAISE EXCEPTION 'Message not found'; END IF; RETURN _id;
END $$;

CREATE OR REPLACE FUNCTION public.delete_event_guestbook_text(_token text,_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  DELETE FROM public.event_guestbook_messages m USING public.event_media_upload_tokens t
  WHERE m.id=_id AND t.token=_token AND t.gallery_id=m.gallery_id AND (t.expires_at IS NULL OR t.expires_at>now());
  RETURN FOUND;
END $$;

CREATE OR REPLACE FUNCTION public.delete_event_guestbook_media(_token text,_item_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  DELETE FROM public.event_media_items i USING public.event_media_upload_tokens t
  WHERE i.id=_item_id AND i.source_category='guestbook_recording' AND t.token=_token
    AND t.gallery_id=i.gallery_id AND (t.expires_at IS NULL OR t.expires_at>now());
  RETURN FOUND;
END $$;

CREATE OR REPLACE FUNCTION public.delete_event_media_items(_item_ids uuid[])
RETURNS TABLE(id uuid,storage_path text) LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  RETURN QUERY DELETE FROM public.event_media_items i
  WHERE i.id=ANY(_item_ids) AND i.source_category IN ('guest_upload','photo_booth')
    AND public.can_access_event(auth.uid(),i.event_id)
  RETURNING i.id,i.storage_path;
END $$;

CREATE OR REPLACE FUNCTION public.delete_event_media_item(_item_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  DELETE FROM public.event_media_items i WHERE i.id=_item_id AND i.source_category IN ('guest_upload','photo_booth')
    AND public.can_access_event(auth.uid(),i.event_id); RETURN FOUND;
END $$;

CREATE OR REPLACE FUNCTION public.sync_event_media_like_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  UPDATE public.event_media_items SET like_count=(SELECT count(*) FROM public.event_media_likes l WHERE l.item_id=COALESCE(NEW.item_id,OLD.item_id))
  WHERE id=COALESCE(NEW.item_id,OLD.item_id); RETURN COALESCE(NEW,OLD);
END $$;
DROP TRIGGER IF EXISTS trg_sync_event_media_like_count ON public.event_media_likes;
CREATE TRIGGER trg_sync_event_media_like_count AFTER INSERT OR DELETE ON public.event_media_likes
FOR EACH ROW EXECUTE FUNCTION public.sync_event_media_like_count();

CREATE OR REPLACE FUNCTION public.toggle_event_media_like(_token text,_item_id uuid,_device_id text)
RETURNS TABLE(liked boolean,like_count integer) LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _liked boolean; BEGIN
  IF length(COALESCE(_device_id,''))<8 OR NOT EXISTS(
    SELECT 1 FROM public.event_media_upload_tokens t JOIN public.event_media_items i ON i.gallery_id=t.gallery_id
    JOIN public.event_media_galleries g ON g.id=t.gallery_id
    WHERE t.token=_token AND i.id=_item_id AND g.is_open AND i.upload_status='uploaded' AND i.moderation_status='approved'
      AND (t.expires_at IS NULL OR t.expires_at>now())
  ) THEN RAISE EXCEPTION 'Invalid gallery item'; END IF;
  DELETE FROM public.event_media_likes WHERE item_id=_item_id AND device_id=_device_id;
  IF FOUND THEN _liked:=false; ELSE INSERT INTO public.event_media_likes(item_id,device_id) VALUES(_item_id,_device_id); _liked:=true; END IF;
  RETURN QUERY SELECT _liked,i.like_count FROM public.event_media_items i WHERE i.id=_item_id;
END $$;

CREATE OR REPLACE FUNCTION public.get_event_media_likes_for_device(_token text,_device_id text)
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT l.item_id FROM public.event_media_likes l JOIN public.event_media_items i ON i.id=l.item_id
  JOIN public.event_media_upload_tokens t ON t.gallery_id=i.gallery_id
  WHERE t.token=_token AND l.device_id=_device_id AND (t.expires_at IS NULL OR t.expires_at>now())
$$;

-- Public functions are explicitly allow-listed; all other execution is denied.
REVOKE ALL ON FUNCTION public.ensure_event_media_gallery(uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.get_event_media_gallery_host(uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.get_event_media_items_host(uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.set_event_media_gallery_open(uuid,boolean) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.update_event_media_limits(uuid,integer,integer,bigint,bigint,integer,bigint) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.update_event_media_display_settings(uuid,text,text,boolean,integer) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.update_event_media_branding(uuid,text,text,text,text,boolean,text,text,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.set_event_media_guest_feature(uuid,text,boolean) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.set_event_media_video_guestbook(uuid,boolean) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.set_event_media_photo_booth(uuid,boolean) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.set_event_media_slideshow(uuid,boolean) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.set_event_media_photo_booth_mode(uuid,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.update_event_media_photo_booth_template(uuid,text,text,text,text,jsonb) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.update_event_media_slideshow_settings(uuid,boolean,boolean,text[],text,integer,text,boolean,boolean) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.set_event_media_moderation(uuid,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.set_event_media_album(uuid,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.set_event_media_albums(uuid[],text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.set_event_media_guestbook_share(uuid,boolean) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.set_event_media_password(uuid,boolean,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.delete_event_media_items(uuid[]) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.delete_event_media_item(uuid) FROM PUBLIC,anon;

GRANT EXECUTE ON FUNCTION public.ensure_event_media_gallery(uuid),public.get_event_media_gallery_host(uuid),
  public.get_event_media_items_host(uuid),public.set_event_media_gallery_open(uuid,boolean),
  public.update_event_media_limits(uuid,integer,integer,bigint,bigint,integer,bigint),
  public.update_event_media_display_settings(uuid,text,text,boolean,integer),
  public.update_event_media_branding(uuid,text,text,text,text,boolean,text,text,text),
  public.set_event_media_guest_feature(uuid,text,boolean),public.set_event_media_video_guestbook(uuid,boolean),
  public.set_event_media_photo_booth(uuid,boolean),public.set_event_media_slideshow(uuid,boolean),
  public.set_event_media_photo_booth_mode(uuid,text),
  public.update_event_media_photo_booth_template(uuid,text,text,text,text,jsonb),
  public.update_event_media_slideshow_settings(uuid,boolean,boolean,text[],text,integer,text,boolean,boolean),
  public.set_event_media_moderation(uuid,text),public.set_event_media_album(uuid,text),
  public.set_event_media_albums(uuid[],text),public.set_event_media_guestbook_share(uuid,boolean),
  public.set_event_media_password(uuid,boolean,text),public.delete_event_media_items(uuid[]),
  public.delete_event_media_item(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.verify_event_media_password(text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.verify_event_media_password(text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_event_media_gallery_public(text),public.get_event_media_items_public(text),
  public.get_event_media_gallery_usage_public(text),public.register_event_media_upload(text,public.event_media_kind,text,bigint,integer,text,text,text,text,text),
  public.register_event_guestbook_upload(text,public.event_media_kind,text,bigint,integer,text,text,text),
  public.register_event_photobooth_upload(text,text,bigint,text,text,boolean),
  public.finalize_event_media_upload(uuid,text),public.fail_event_media_upload(uuid,text),
  public.submit_event_guestbook_text(text,text,text),public.update_event_guestbook_text(text,uuid,text,text),
  public.delete_event_guestbook_text(text,uuid),public.delete_event_guestbook_media(text,uuid),
  public.toggle_event_media_like(text,uuid,text),public.get_event_media_likes_for_device(text,text)
TO anon,authenticated,service_role;

-- Realtime invalidation is best effort and idempotent.
ALTER TABLE public.event_media_items REPLICA IDENTITY FULL;
DO $realtime$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='event_media_items'
  ) THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.event_media_items; END IF;
END
$realtime$;
