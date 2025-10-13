-- Create analytics table
CREATE TABLE IF NOT EXISTS public.gallery_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gallery_id uuid REFERENCES public.galleries(id) ON DELETE CASCADE NOT NULL,
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('view', 'share', 'download', 'bulk_download')),
  source text CHECK (source IN ('qr', 'link', 'direct', 'share_button')),
  device_type text CHECK (device_type IN ('mobile', 'desktop', 'tablet')),
  referrer text,
  user_agent text,
  ip_address inet,
  session_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_gallery_analytics_gallery_id ON public.gallery_analytics(gallery_id);
CREATE INDEX idx_gallery_analytics_event_id ON public.gallery_analytics(event_id);
CREATE INDEX idx_gallery_analytics_type ON public.gallery_analytics(type);
CREATE INDEX idx_gallery_analytics_created_at ON public.gallery_analytics(created_at DESC);

-- Enable RLS
ALTER TABLE public.gallery_analytics ENABLE ROW LEVEL SECURITY;

-- Policy: Gallery owners can view their analytics
CREATE POLICY "Gallery owners can view their analytics"
ON public.gallery_analytics
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.galleries
    WHERE galleries.id = gallery_analytics.gallery_id
    AND galleries.owner_id = auth.uid()
  )
);

-- Policy: Anyone can insert analytics (for public tracking)
CREATE POLICY "Anyone can insert analytics"
ON public.gallery_analytics
FOR INSERT
WITH CHECK (true);

-- Create function to get gallery analytics summary
CREATE OR REPLACE FUNCTION public.get_gallery_analytics_summary(
  _gallery_id uuid
)
RETURNS TABLE (
  total_views bigint,
  unique_sessions bigint,
  total_shares bigint,
  total_downloads bigint,
  last_activity timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COUNT(*) FILTER (WHERE type = 'view') as total_views,
    COUNT(DISTINCT session_id) FILTER (WHERE type = 'view') as unique_sessions,
    COUNT(*) FILTER (WHERE type = 'share') as total_shares,
    COUNT(*) FILTER (WHERE type IN ('download', 'bulk_download')) as total_downloads,
    MAX(created_at) as last_activity
  FROM public.gallery_analytics
  WHERE gallery_id = _gallery_id;
$$;

-- Create function for admin to get all gallery analytics
CREATE OR REPLACE FUNCTION public.get_all_gallery_analytics()
RETURNS TABLE (
  gallery_id uuid,
  gallery_title text,
  event_name text,
  event_date date,
  total_views bigint,
  unique_sessions bigint,
  total_shares bigint,
  total_downloads bigint,
  last_activity timestamptz,
  owner_email text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    g.id as gallery_id,
    g.title as gallery_title,
    e.name as event_name,
    e.date as event_date,
    COUNT(*) FILTER (WHERE ga.type = 'view') as total_views,
    COUNT(DISTINCT ga.session_id) FILTER (WHERE ga.type = 'view') as unique_sessions,
    COUNT(*) FILTER (WHERE ga.type = 'share') as total_shares,
    COUNT(*) FILTER (WHERE ga.type IN ('download', 'bulk_download')) as total_downloads,
    MAX(ga.created_at) as last_activity,
    p.email as owner_email
  FROM public.galleries g
  LEFT JOIN public.events e ON g.event_id = e.id
  LEFT JOIN public.gallery_analytics ga ON g.id = ga.gallery_id
  LEFT JOIN public.profiles p ON g.owner_id = p.id
  GROUP BY g.id, g.title, e.name, e.date, p.email
  ORDER BY MAX(ga.created_at) DESC NULLS LAST;
$$;