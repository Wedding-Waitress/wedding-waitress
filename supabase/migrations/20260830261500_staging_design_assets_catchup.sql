-- Staging catch-up for signage, place-card and venue-template design assets.
-- Curated galleries intentionally start empty; production media is not copied.

CREATE TABLE IF NOT EXISTS public.signage_settings(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),event_id uuid NOT NULL UNIQUE REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),orientation text NOT NULL DEFAULT 'portrait',background_color text NOT NULL DEFAULT '#ffffff',
  background_image_url text,background_image_type text NOT NULL DEFAULT 'none',background_image_x_position numeric NOT NULL DEFAULT 50,
  background_image_y_position numeric NOT NULL DEFAULT 50,background_image_opacity numeric NOT NULL DEFAULT 100,
  background_image_preview_url text,background_image_print_url text,background_image_thumb_url text,
  background_image_width_px integer,background_image_height_px integer,text_zones jsonb NOT NULL DEFAULT '[]',
  qr_config jsonb NOT NULL DEFAULT '{"enabled":false,"x_percent":50,"y_percent":85,"size_percent":22,"rotation":0,"event_id":null}',
  notes text,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.signage_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.signage_settings FROM PUBLIC,anon;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.signage_settings TO authenticated;
DROP POLICY IF EXISTS "Event managers manage signage settings" ON public.signage_settings;
CREATE POLICY "Event managers manage signage settings" ON public.signage_settings FOR ALL TO authenticated
USING(public.can_access_event((SELECT auth.uid()),event_id)) WITH CHECK(public.can_access_event((SELECT auth.uid()),event_id));

CREATE OR REPLACE FUNCTION public.enforce_signage_settings_owner() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE owner_id uuid; BEGIN SELECT e.user_id INTO owner_id FROM public.events e WHERE e.id=NEW.event_id AND public.can_access_event(auth.uid(),e.id); IF owner_id IS NULL THEN RAISE EXCEPTION 'Not authorized' USING ERRCODE='42501'; END IF; IF TG_OP='UPDATE' AND NEW.event_id<>OLD.event_id THEN RAISE EXCEPTION 'Event cannot be changed'; END IF; NEW.user_id:=owner_id; RETURN NEW; END $$;
REVOKE ALL ON FUNCTION public.enforce_signage_settings_owner() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS enforce_signage_settings_owner ON public.signage_settings;
CREATE TRIGGER enforce_signage_settings_owner BEFORE INSERT OR UPDATE OF event_id,user_id ON public.signage_settings FOR EACH ROW EXECUTE FUNCTION public.enforce_signage_settings_owner();
DROP TRIGGER IF EXISTS update_signage_settings_updated_at ON public.signage_settings;
CREATE TRIGGER update_signage_settings_updated_at BEFORE UPDATE ON public.signage_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.signage_gallery_images(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),name text NOT NULL,category text NOT NULL,image_url text NOT NULL,
  thumbnail_url text,preview_url text,sort_order integer NOT NULL DEFAULT 0,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.signage_categories(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),name text NOT NULL UNIQUE,slug text NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.signage_image_categories(
  image_id uuid NOT NULL REFERENCES public.signage_gallery_images(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.signage_categories(id) ON DELETE CASCADE,created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(image_id,category_id)
);

CREATE TABLE IF NOT EXISTS public.place_card_gallery_images(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),name text NOT NULL,category text NOT NULL DEFAULT 'General',image_url text NOT NULL,
  thumbnail_url text,sort_order integer NOT NULL DEFAULT 0,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.place_card_categories(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),name text NOT NULL UNIQUE,slug text NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.place_card_image_categories(
  image_id uuid NOT NULL REFERENCES public.place_card_gallery_images(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.place_card_categories(id) ON DELETE CASCADE,created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(image_id,category_id)
);

DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['signage_gallery_images','signage_categories','signage_image_categories','place_card_gallery_images','place_card_categories','place_card_image_categories'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC',t);
  EXECUTE format('GRANT SELECT ON public.%I TO anon,authenticated',t);
  EXECUTE format('GRANT INSERT,UPDATE,DELETE ON public.%I TO authenticated',t);
  EXECUTE format('DROP POLICY IF EXISTS "Public reads curated assets" ON public.%I',t);
  EXECUTE format('CREATE POLICY "Public reads curated assets" ON public.%I FOR SELECT TO anon,authenticated USING(true)',t);
  EXECUTE format('DROP POLICY IF EXISTS "Admins manage curated assets" ON public.%I',t);
  EXECUTE format('CREATE POLICY "Admins manage curated assets" ON public.%I FOR ALL TO authenticated USING(public.has_role((SELECT auth.uid()),''admin''::public.app_role)) WITH CHECK(public.has_role((SELECT auth.uid()),''admin''::public.app_role))',t);
END LOOP; END $$;

CREATE TABLE IF NOT EXISTS public.venue_floor_plan_templates(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),submitted_by uuid NOT NULL REFERENCES auth.users(id),venue_name text NOT NULL,room_name text NOT NULL,
  city text,country text,capacity integer NOT NULL DEFAULT 0 CHECK(capacity>=0),room_shape text NOT NULL DEFAULT 'rect',room_width_m numeric NOT NULL DEFAULT 12,
  room_length_m numeric NOT NULL DEFAULT 15,grid_size_cm integer NOT NULL DEFAULT 50,room_polygon jsonb,fixtures jsonb NOT NULL DEFAULT '[]',
  table_positions jsonb NOT NULL DEFAULT '[]',background_image_path text,background_x numeric NOT NULL DEFAULT 0,background_y numeric NOT NULL DEFAULT 0,
  background_width numeric,background_height numeric,background_rotation numeric NOT NULL DEFAULT 0,background_opacity numeric NOT NULL DEFAULT .6,
  notes text,approved boolean NOT NULL DEFAULT false,featured boolean NOT NULL DEFAULT false,approved_at timestamptz,approved_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vftp_approved ON public.venue_floor_plan_templates(approved) WHERE approved=true;
CREATE INDEX IF NOT EXISTS idx_vftp_submitter ON public.venue_floor_plan_templates(submitted_by);
ALTER TABLE public.venue_floor_plan_templates ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.venue_floor_plan_templates FROM PUBLIC,anon;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.venue_floor_plan_templates TO authenticated;
DROP POLICY IF EXISTS "Users read approved or own venue templates" ON public.venue_floor_plan_templates;
CREATE POLICY "Users read approved or own venue templates" ON public.venue_floor_plan_templates FOR SELECT TO authenticated
USING(approved OR submitted_by=(SELECT auth.uid()) OR public.has_role((SELECT auth.uid()),'admin'::public.app_role));
DROP POLICY IF EXISTS "Users submit own venue templates" ON public.venue_floor_plan_templates;
CREATE POLICY "Users submit own venue templates" ON public.venue_floor_plan_templates FOR INSERT TO authenticated WITH CHECK(submitted_by=(SELECT auth.uid()) AND NOT approved AND approved_by IS NULL);
DROP POLICY IF EXISTS "Users update own pending venue templates" ON public.venue_floor_plan_templates;
CREATE POLICY "Users update own pending venue templates" ON public.venue_floor_plan_templates FOR UPDATE TO authenticated
USING((submitted_by=(SELECT auth.uid()) AND NOT approved) OR public.has_role((SELECT auth.uid()),'admin'::public.app_role))
WITH CHECK((submitted_by=(SELECT auth.uid()) AND NOT approved AND approved_by IS NULL) OR public.has_role((SELECT auth.uid()),'admin'::public.app_role));
DROP POLICY IF EXISTS "Users delete own pending venue templates" ON public.venue_floor_plan_templates;
CREATE POLICY "Users delete own pending venue templates" ON public.venue_floor_plan_templates FOR DELETE TO authenticated
USING((submitted_by=(SELECT auth.uid()) AND NOT approved) OR public.has_role((SELECT auth.uid()),'admin'::public.app_role));
DROP TRIGGER IF EXISTS trg_vftp_updated_at ON public.venue_floor_plan_templates;
CREATE TRIGGER trg_vftp_updated_at BEFORE UPDATE ON public.venue_floor_plan_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types) VALUES
('signage-gallery','signage-gallery',true,524288000,ARRAY['image/jpeg','image/png','image/webp']),
('place-card-gallery','place-card-gallery',true,524288000,ARRAY['image/jpeg','image/png','image/webp']),
('venue-template-backgrounds','venue-template-backgrounds',false,26214400,ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT(id) DO UPDATE SET public=EXCLUDED.public,file_size_limit=EXCLUDED.file_size_limit,allowed_mime_types=EXCLUDED.allowed_mime_types;

DO $$ DECLARE b text; BEGIN FOREACH b IN ARRAY ARRAY['signage-gallery','place-card-gallery'] LOOP
  EXECUTE format('DROP POLICY IF EXISTS "Public reads %s" ON storage.objects',b);
  EXECUTE format('CREATE POLICY "Public reads %s" ON storage.objects FOR SELECT TO anon,authenticated USING(bucket_id=%L)',b,b);
  EXECUTE format('DROP POLICY IF EXISTS "Admins manage %s" ON storage.objects',b);
  EXECUTE format('CREATE POLICY "Admins manage %s" ON storage.objects FOR ALL TO authenticated USING(bucket_id=%L AND public.has_role((SELECT auth.uid()),''admin''::public.app_role)) WITH CHECK(bucket_id=%L AND public.has_role((SELECT auth.uid()),''admin''::public.app_role))',b,b,b);
END LOOP; END $$;
DROP POLICY IF EXISTS "Public reads venue template backgrounds" ON storage.objects;
DROP POLICY IF EXISTS "Users manage own venue template backgrounds" ON storage.objects;
CREATE POLICY "Users manage own venue template backgrounds" ON storage.objects FOR ALL TO authenticated
USING(bucket_id='venue-template-backgrounds' AND (storage.foldername(name))[1]=(SELECT auth.uid())::text)
WITH CHECK(bucket_id='venue-template-backgrounds' AND (storage.foldername(name))[1]=(SELECT auth.uid())::text);
