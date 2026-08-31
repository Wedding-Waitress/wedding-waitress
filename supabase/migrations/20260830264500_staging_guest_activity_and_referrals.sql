DO $$ BEGIN
  CREATE TYPE public.guest_activity_type AS ENUM (
    'invited_email', 'invited_sms', 'delivered', 'opened', 'clicked',
    'responded', 'resent', 'reminder_sent', 'rsvp_changed',
    'plus_one_added', 'note_added', 'bounced', 'failed', 'unsubscribed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.guest_activity_channel AS ENUM ('email', 'sms', 'whatsapp', 'system', 'web');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.guest_activity_status AS ENUM ('success', 'failure', 'pending', 'info');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.guest_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  guest_id uuid NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  activity_type public.guest_activity_type NOT NULL,
  channel public.guest_activity_channel NOT NULL DEFAULT 'system',
  status public.guest_activity_status NOT NULL DEFAULT 'success',
  summary text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_guest_activities_guest_time ON public.guest_activities(guest_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_guest_activities_event_time ON public.guest_activities(event_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_guest_activities_type ON public.guest_activities(activity_type);

ALTER TABLE public.guest_activities ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.guest_activities FROM PUBLIC, anon;
GRANT SELECT, INSERT, DELETE ON public.guest_activities TO authenticated;

DROP POLICY IF EXISTS "Event managers read guest activities" ON public.guest_activities;
CREATE POLICY "Event managers read guest activities" ON public.guest_activities
  FOR SELECT TO authenticated
  USING (public.can_access_event((SELECT auth.uid()), event_id));

DROP POLICY IF EXISTS "Event managers insert valid guest activities" ON public.guest_activities;
CREATE POLICY "Event managers insert valid guest activities" ON public.guest_activities
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND public.can_access_event((SELECT auth.uid()), event_id)
    AND EXISTS (
      SELECT 1 FROM public.guests g
      WHERE g.id = guest_activities.guest_id AND g.event_id = guest_activities.event_id
    )
  );

DROP POLICY IF EXISTS "Event managers delete guest activities" ON public.guest_activities;
CREATE POLICY "Event managers delete guest activities" ON public.guest_activities
  FOR DELETE TO authenticated
  USING (public.can_access_event((SELECT auth.uid()), event_id));

ALTER TABLE public.guest_activities REPLICA IDENTITY FULL;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'guest_activities'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.guest_activities;
  END IF;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION public.log_guest_activity(
  _guest_id uuid,
  _activity_type public.guest_activity_type,
  _channel public.guest_activity_channel DEFAULT 'system',
  _status public.guest_activity_status DEFAULT 'success',
  _summary text DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb,
  _occurred_at timestamptz DEFAULT now()
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _event_id uuid;
  _owner_id uuid;
  _new_id uuid;
BEGIN
  SELECT g.event_id, e.user_id INTO _event_id, _owner_id
  FROM public.guests g
  JOIN public.events e ON e.id = g.event_id
  WHERE g.id = _guest_id;

  IF _event_id IS NULL THEN RETURN NULL; END IF;

  INSERT INTO public.guest_activities(
    event_id, guest_id, user_id, activity_type, channel, status, summary, metadata, occurred_at
  ) VALUES (
    _event_id, _guest_id, _owner_id, _activity_type, _channel, _status,
    _summary, COALESCE(_metadata, '{}'::jsonb), _occurred_at
  ) RETURNING id INTO _new_id;
  RETURN _new_id;
END;
$$;
REVOKE ALL ON FUNCTION public.log_guest_activity(
  uuid, public.guest_activity_type, public.guest_activity_channel,
  public.guest_activity_status, text, jsonb, timestamptz
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_guest_activity(
  uuid, public.guest_activity_type, public.guest_activity_channel,
  public.guest_activity_status, text, jsonb, timestamptz
) TO service_role;

CREATE OR REPLACE FUNCTION public.trg_log_rsvp_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(OLD.rsvp, '') IS DISTINCT FROM COALESCE(NEW.rsvp, '') THEN
    PERFORM public.log_guest_activity(
      NEW.id, 'rsvp_changed', 'system', 'success',
      format('RSVP changed from %s to %s', COALESCE(OLD.rsvp, '—'), COALESCE(NEW.rsvp, '—')),
      jsonb_build_object('from', OLD.rsvp, 'to', NEW.rsvp), now()
    );
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.trg_log_rsvp_change() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS guests_log_rsvp_change ON public.guests;
CREATE TRIGGER guests_log_rsvp_change
  AFTER UPDATE OF rsvp ON public.guests
  FOR EACH ROW EXECUTE FUNCTION public.trg_log_rsvp_change();

CREATE TABLE IF NOT EXISTS public.event_referral_dismissals (
  user_id uuid NOT NULL,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  dismissed_at timestamptz NOT NULL DEFAULT now(),
  snooze_until timestamptz,
  PRIMARY KEY(user_id, event_id)
);

ALTER TABLE public.event_referral_dismissals ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.event_referral_dismissals FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_referral_dismissals TO authenticated;

DROP POLICY IF EXISTS "Users manage accessible event referral dismissals" ON public.event_referral_dismissals;
CREATE POLICY "Users manage accessible event referral dismissals" ON public.event_referral_dismissals
  FOR ALL TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    AND public.can_access_event((SELECT auth.uid()), event_id)
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND public.can_access_event((SELECT auth.uid()), event_id)
  );
