ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS venue_contact_email text,
  ADD COLUMN IF NOT EXISTS ceremony_venue_contact_email text;

CREATE TABLE IF NOT EXISTS public.venue_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  venue_name text,
  venue_email text NOT NULL,
  venue_contact_name text,
  status text NOT NULL DEFAULT 'sent',
  sent_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT venue_invitations_event_email_unique UNIQUE (event_id, venue_email)
);

CREATE INDEX IF NOT EXISTS idx_venue_invitations_user ON public.venue_invitations(user_id);
CREATE INDEX IF NOT EXISTS idx_venue_invitations_event ON public.venue_invitations(event_id);

ALTER TABLE public.venue_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners select own venue invitations" ON public.venue_invitations;
CREATE POLICY "Owners select own venue invitations"
  ON public.venue_invitations FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Master can insert venue invitations" ON public.venue_invitations;
CREATE POLICY "Master can insert venue invitations"
  ON public.venue_invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    (select auth.uid()) = user_id
    AND public.is_account_master((select auth.uid()))
    AND EXISTS (SELECT 1 FROM public.events e WHERE e.id = venue_invitations.event_id AND e.user_id = (select auth.uid()))
  );

CREATE TABLE IF NOT EXISTS public.event_referral_dismissals (
  user_id uuid NOT NULL,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  dismissed_at timestamptz NOT NULL DEFAULT now(),
  snooze_until timestamptz,
  PRIMARY KEY (user_id, event_id)
);

ALTER TABLE public.event_referral_dismissals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own referral dismissals" ON public.event_referral_dismissals;
CREATE POLICY "Users manage own referral dismissals"
  ON public.event_referral_dismissals FOR ALL
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);