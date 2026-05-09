
-- Storage bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('testimonial-videos', 'testimonial-videos', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: users can only act within their own {user_id}/ folder
CREATE POLICY "Users upload own testimonial videos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'testimonial-videos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users read own testimonial videos"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'testimonial-videos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users delete own testimonial videos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'testimonial-videos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Submissions table
CREATE TABLE public.testimonial_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  storage_path text NOT NULL,
  mime_type text,
  duration_seconds integer,
  size_bytes bigint,
  caption text,
  event_name text,
  consent_approved boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending_review'
    CHECK (status IN ('pending_review', 'approved', 'rejected')),
  review_notes text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_testimonial_submissions_user_created
  ON public.testimonial_submissions (user_id, created_at DESC);
CREATE INDEX idx_testimonial_submissions_status_created
  ON public.testimonial_submissions (status, created_at DESC);

ALTER TABLE public.testimonial_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own testimonials"
ON public.testimonial_submissions FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users insert own testimonials with consent"
ON public.testimonial_submissions FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND consent_approved = true);

-- RPC for recent submissions
CREATE OR REPLACE FUNCTION public.get_my_testimonial_submissions(p_limit integer DEFAULT 5)
RETURNS TABLE (
  id uuid,
  status text,
  caption text,
  event_name text,
  created_at timestamptz
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, status, caption, event_name, created_at
  FROM public.testimonial_submissions
  WHERE user_id = auth.uid()
  ORDER BY created_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 5), 50));
$$;
