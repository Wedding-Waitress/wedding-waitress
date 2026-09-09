-- Applied via Supabase MCP: venue_trial_interests
CREATE TABLE public.venue_trial_interests (request_id uuid PRIMARY KEY REFERENCES public.venue_floor_plan_requests(id), venue_name text NOT NULL, venue_email text NOT NULL, venue_contact_number text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE public.venue_trial_interests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.venue_trial_interests FROM anon, authenticated;
GRANT ALL ON public.venue_trial_interests TO service_role;
