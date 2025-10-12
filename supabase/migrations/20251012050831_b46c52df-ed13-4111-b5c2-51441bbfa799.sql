-- Create event_shortlinks table
CREATE TABLE public.event_shortlinks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE,
  target_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  click_count integer DEFAULT 0,
  last_clicked_at timestamptz
);

-- Create unique index: one shortlink per event
CREATE UNIQUE INDEX event_shortlinks_event_id_idx ON public.event_shortlinks(event_id);

-- Create index for fast slug lookups
CREATE INDEX event_shortlinks_slug_idx ON public.event_shortlinks(slug);

-- Enable RLS
ALTER TABLE public.event_shortlinks ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own event shortlinks
CREATE POLICY "Users can view their own event shortlinks"
  ON public.event_shortlinks FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.events e 
    WHERE e.id = event_shortlinks.event_id 
    AND e.user_id = auth.uid()
  ));

-- RLS Policy: Users can create shortlinks for their events
CREATE POLICY "Users can create shortlinks for their events"
  ON public.event_shortlinks FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.events e 
    WHERE e.id = event_shortlinks.event_id 
    AND e.user_id = auth.uid()
  ));

-- RLS Policy: Users can update their own event shortlinks
CREATE POLICY "Users can update their own event shortlinks"
  ON public.event_shortlinks FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.events e 
    WHERE e.id = event_shortlinks.event_id 
    AND e.user_id = auth.uid()
  ));

-- RLS Policy: Anonymous users can read shortlinks for redirects
CREATE POLICY "Anonymous users can read active shortlinks"
  ON public.event_shortlinks FOR SELECT
  USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_event_shortlinks_updated_at
  BEFORE UPDATE ON public.event_shortlinks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate short 5-character base62 slug
CREATE OR REPLACE FUNCTION public.generate_short_slug()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  chars text := '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  new_slug text;
  attempts integer := 0;
BEGIN
  LOOP
    new_slug := '';
    FOR i IN 1..5 LOOP
      new_slug := new_slug || substr(chars, floor(random() * 62 + 1)::int, 1);
    END LOOP;
    
    IF NOT EXISTS (SELECT 1 FROM event_shortlinks WHERE event_shortlinks.slug = new_slug) THEN
      RETURN new_slug;
    END IF;
    
    attempts := attempts + 1;
    IF attempts > 100 THEN
      RAISE EXCEPTION 'Unable to generate unique short slug after 100 attempts';
    END IF;
  END LOOP;
END;
$$;

-- Trigger function to auto-generate shortlinks
CREATE OR REPLACE FUNCTION public.ensure_event_shortlink()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  short_slug text;
  target_path text;
BEGIN
  IF NEW.slug IS NOT NULL AND NEW.slug != '' THEN
    IF NOT EXISTS (
      SELECT 1 FROM event_shortlinks WHERE event_id = NEW.id
    ) THEN
      short_slug := public.generate_short_slug();
      target_path := '/s/' || NEW.slug;
      
      INSERT INTO event_shortlinks (event_id, slug, target_url)
      VALUES (NEW.id, short_slug, target_path);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_ensure_event_shortlink
  AFTER INSERT OR UPDATE OF slug ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_event_shortlink();

-- Backfill existing events with shortlinks
DO $$
DECLARE
  event_record RECORD;
  short_slug text;
BEGIN
  FOR event_record IN 
    SELECT e.id, e.slug 
    FROM events e
    LEFT JOIN event_shortlinks es ON es.event_id = e.id
    WHERE e.slug IS NOT NULL 
    AND es.id IS NULL
  LOOP
    short_slug := public.generate_short_slug();
    INSERT INTO event_shortlinks (event_id, slug, target_url)
    VALUES (event_record.id, short_slug, '/s/' || event_record.slug);
  END LOOP;
END $$;

-- Add use_simplified_qr column to qr_code_settings
ALTER TABLE public.qr_code_settings 
ADD COLUMN IF NOT EXISTS use_simplified_qr boolean DEFAULT true;