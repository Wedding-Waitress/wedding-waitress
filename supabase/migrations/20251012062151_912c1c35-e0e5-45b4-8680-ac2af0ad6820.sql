-- Create gallery_shortlinks table for simplified QR codes
CREATE TABLE IF NOT EXISTS public.gallery_shortlinks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gallery_id UUID NOT NULL REFERENCES public.galleries(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  target_path TEXT NOT NULL,
  click_count INTEGER NOT NULL DEFAULT 0,
  last_clicked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_gallery_shortlinks_gallery_id ON public.gallery_shortlinks(gallery_id);
CREATE INDEX IF NOT EXISTS idx_gallery_shortlinks_slug ON public.gallery_shortlinks(slug);

-- Enable RLS
ALTER TABLE public.gallery_shortlinks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Gallery owners can manage shortlinks"
ON public.gallery_shortlinks
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.galleries
    WHERE galleries.id = gallery_shortlinks.gallery_id
    AND galleries.owner_id = auth.uid()
  )
);

CREATE POLICY "Public can read shortlinks for redirect"
ON public.gallery_shortlinks
FOR SELECT
USING (true);

-- Trigger to auto-update updated_at
CREATE TRIGGER update_gallery_shortlinks_updated_at
BEFORE UPDATE ON public.gallery_shortlinks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to auto-create shortlink when gallery is created/updated
CREATE OR REPLACE FUNCTION public.ensure_gallery_shortlink()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  short_slug TEXT;
BEGIN
  IF NEW.slug IS NOT NULL AND NEW.slug != '' THEN
    IF NOT EXISTS (
      SELECT 1 FROM gallery_shortlinks WHERE gallery_id = NEW.id
    ) THEN
      short_slug := public.generate_short_slug();
      
      INSERT INTO gallery_shortlinks (gallery_id, slug, target_path)
      VALUES (NEW.id, short_slug, '/g/' || NEW.slug);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER ensure_gallery_shortlink_trigger
AFTER INSERT OR UPDATE ON public.galleries
FOR EACH ROW
EXECUTE FUNCTION public.ensure_gallery_shortlink();

-- Backfill existing galleries
INSERT INTO public.gallery_shortlinks (gallery_id, slug, target_path)
SELECT 
  g.id,
  public.generate_short_slug(),
  '/g/' || g.slug
FROM public.galleries g
WHERE g.slug IS NOT NULL 
  AND g.slug != ''
  AND NOT EXISTS (
    SELECT 1 FROM public.gallery_shortlinks gs WHERE gs.gallery_id = g.id
  );

-- Add realtime support
ALTER PUBLICATION supabase_realtime ADD TABLE public.gallery_shortlinks;