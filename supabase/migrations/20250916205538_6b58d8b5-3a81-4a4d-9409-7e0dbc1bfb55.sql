-- Add slug field to events table for SEO-friendly URLs
ALTER TABLE public.events 
ADD COLUMN slug text;

-- Create unique index for slugs
CREATE UNIQUE INDEX events_slug_idx ON public.events(slug);

-- Create function to generate slug from event name
CREATE OR REPLACE FUNCTION public.generate_slug(input_text text)
RETURNS text AS $$
DECLARE
  slug_text text;
  counter integer := 0;
  final_slug text;
BEGIN
  -- Convert to lowercase, replace spaces with hyphens, remove special chars
  slug_text := lower(trim(input_text));
  slug_text := regexp_replace(slug_text, '[^a-z0-9\s-]', '', 'g');
  slug_text := regexp_replace(slug_text, '\s+', '-', 'g');
  slug_text := regexp_replace(slug_text, '-+', '-', 'g');
  slug_text := trim(slug_text, '-');
  
  -- Ensure slug is not empty
  IF slug_text = '' THEN
    slug_text := 'event';
  END IF;
  
  final_slug := slug_text;
  
  -- Check for uniqueness and append counter if needed
  WHILE EXISTS(SELECT 1 FROM events WHERE slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := slug_text || '-' || counter;
  END LOOP;
  
  RETURN final_slug;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create QR code settings table
CREATE TABLE public.qr_code_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  shape text DEFAULT 'square',
  pattern text DEFAULT 'basic',
  background_color text DEFAULT '#ffffff',
  foreground_color text DEFAULT '#000000',
  background_image_url text,
  center_image_url text,
  corner_style text DEFAULT 'square',
  has_scan_text boolean DEFAULT true,
  scan_text text DEFAULT 'SCAN ME',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable Row Level Security on qr_code_settings
ALTER TABLE public.qr_code_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for qr_code_settings
CREATE POLICY "Users can create their own QR settings" 
ON public.qr_code_settings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own QR settings" 
ON public.qr_code_settings 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own QR settings" 
ON public.qr_code_settings 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own QR settings" 
ON public.qr_code_settings 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_qr_code_settings_updated_at
BEFORE UPDATE ON public.qr_code_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update existing events with generated slugs
UPDATE public.events 
SET slug = public.generate_slug(name) 
WHERE slug IS NULL;