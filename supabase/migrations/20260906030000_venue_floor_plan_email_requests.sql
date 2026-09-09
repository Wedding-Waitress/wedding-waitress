CREATE TABLE public.venue_floor_plan_requests (
 id uuid PRIMARY KEY, requester_id uuid NOT NULL REFERENCES auth.users(id), token_hash text NOT NULL UNIQUE,
 requester_name text NOT NULL, venue_name text NOT NULL, venue_email text NOT NULL, room_name text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL DEFAULT now()+interval '30 days',
 sent_at timestamptz, provider_id text, status text NOT NULL DEFAULT 'pending');
ALTER TABLE public.venue_floor_plan_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY request_owner_read ON public.venue_floor_plan_requests FOR SELECT TO authenticated USING (requester_id=auth.uid());
GRANT SELECT ON public.venue_floor_plan_requests TO authenticated;
ALTER TABLE public.venue_floor_plan_templates ADD COLUMN IF NOT EXISTS source_request_id uuid REFERENCES public.venue_floor_plan_requests(id);
CREATE UNIQUE INDEX venue_request_room_unique ON public.venue_floor_plan_templates(source_request_id,lower(room_name)) WHERE source_request_id IS NOT NULL;
