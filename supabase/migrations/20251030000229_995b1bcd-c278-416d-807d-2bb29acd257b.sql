-- Allow public read access to events table when accessed by slug
-- This enables unauthenticated guests to view basic event info via QR codes
CREATE POLICY "Public can view events by slug"
ON public.events
FOR SELECT
TO public
USING (slug IS NOT NULL);

-- Allow public read access to active gallery settings
-- Guests need these settings to know upload limits and allowed file types
CREATE POLICY "Public can view active gallery settings"
ON public.media_gallery_settings
FOR SELECT
TO public
USING (is_active = true);