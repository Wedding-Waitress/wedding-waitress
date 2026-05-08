-- Activity type enum (extensible — add new values later via ALTER TYPE)
DO $$ BEGIN
  CREATE TYPE public.guest_activity_type AS ENUM (
    'invited_email',
    'invited_sms',
    'delivered',
    'opened',
    'clicked',
    'responded',
    'resent',
    'reminder_sent',
    'rsvp_changed',
    'plus_one_added',
    'note_added',
    'bounced',
    'failed',
    'unsubscribed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.guest_activity_channel AS ENUM ('email', 'sms', 'whatsapp', 'system', 'web');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.guest_activity_status AS ENUM ('success', 'failure', 'pending', 'info');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Main timeline table
CREATE TABLE IF NOT EXISTS public.guest_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  guest_id UUID NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  activity_type public.guest_activity_type NOT NULL,
  channel public.guest_activity_channel NOT NULL DEFAULT 'system',
  status public.guest_activity_status NOT NULL DEFAULT 'success',
  summary TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_guest_activities_guest_time
  ON public.guest_activities (guest_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_guest_activities_event_time
  ON public.guest_activities (event_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_guest_activities_type
  ON public.guest_activities (activity_type);

ALTER TABLE public.guest_activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can read their event activities" ON public.guest_activities;
CREATE POLICY "Owners can read their event activities"
  ON public.guest_activities FOR SELECT
  TO authenticated
  USING (public.can_access_event(auth.uid(), event_id));

DROP POLICY IF EXISTS "Owners can insert activities for their events" ON public.guest_activities;
CREATE POLICY "Owners can insert activities for their events"
  ON public.guest_activities FOR INSERT
  TO authenticated
  WITH CHECK (public.can_access_event(auth.uid(), event_id) AND user_id = auth.uid());

DROP POLICY IF EXISTS "Owners can delete their event activities" ON public.guest_activities;
CREATE POLICY "Owners can delete their event activities"
  ON public.guest_activities FOR DELETE
  TO authenticated
  USING (public.can_access_event(auth.uid(), event_id));

-- Realtime
ALTER TABLE public.guest_activities REPLICA IDENTITY FULL;
DO $$ BEGIN
  PERFORM 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'guest_activities';
  IF NOT FOUND THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.guest_activities';
  END IF;
EXCEPTION WHEN others THEN NULL; END $$;

-- Helper: safe insert from edge functions / triggers (bypasses RLS, validates event ownership)
CREATE OR REPLACE FUNCTION public.log_guest_activity(
  _guest_id UUID,
  _activity_type public.guest_activity_type,
  _channel public.guest_activity_channel DEFAULT 'system',
  _status public.guest_activity_status DEFAULT 'success',
  _summary TEXT DEFAULT NULL,
  _metadata JSONB DEFAULT '{}'::jsonb,
  _occurred_at TIMESTAMPTZ DEFAULT now()
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _event_id UUID;
  _owner_id UUID;
  _new_id UUID;
BEGIN
  SELECT g.event_id, e.user_id
  INTO _event_id, _owner_id
  FROM public.guests g
  JOIN public.events e ON e.id = g.event_id
  WHERE g.id = _guest_id;

  IF _event_id IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.guest_activities (
    event_id, guest_id, user_id, activity_type, channel, status, summary, metadata, occurred_at
  ) VALUES (
    _event_id, _guest_id, _owner_id, _activity_type, _channel, _status, _summary, COALESCE(_metadata, '{}'::jsonb), _occurred_at
  )
  RETURNING id INTO _new_id;

  RETURN _new_id;
END;
$$;

-- Auto-log RSVP changes
CREATE OR REPLACE FUNCTION public.trg_log_rsvp_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND COALESCE(OLD.rsvp,'') IS DISTINCT FROM COALESCE(NEW.rsvp,'') THEN
    PERFORM public.log_guest_activity(
      NEW.id,
      'rsvp_changed'::public.guest_activity_type,
      'system'::public.guest_activity_channel,
      'success'::public.guest_activity_status,
      format('RSVP changed from %s to %s', COALESCE(OLD.rsvp,'—'), COALESCE(NEW.rsvp,'—')),
      jsonb_build_object('from', OLD.rsvp, 'to', NEW.rsvp),
      now()
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guests_log_rsvp_change ON public.guests;
CREATE TRIGGER guests_log_rsvp_change
  AFTER UPDATE OF rsvp ON public.guests
  FOR EACH ROW EXECUTE FUNCTION public.trg_log_rsvp_change();

-- Auto-log SMS sends from sms_send_logs (if table exists)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='sms_send_logs') THEN
    EXECUTE $X$
      CREATE OR REPLACE FUNCTION public.trg_log_sms_activity()
      RETURNS TRIGGER
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $F$
      DECLARE
        _atype public.guest_activity_type;
        _astatus public.guest_activity_status;
        _channel public.guest_activity_channel;
      BEGIN
        IF NEW.guest_id IS NULL THEN RETURN NEW; END IF;

        _channel := CASE LOWER(COALESCE(NEW.delivery_method,'sms'))
          WHEN 'email' THEN 'email'::public.guest_activity_channel
          WHEN 'both'  THEN 'email'::public.guest_activity_channel
          ELSE 'sms'::public.guest_activity_channel
        END;

        _atype := CASE LOWER(COALESCE(NEW.status,''))
          WHEN 'delivered' THEN 'delivered'::public.guest_activity_type
          WHEN 'failed'    THEN 'failed'::public.guest_activity_type
          WHEN 'undelivered' THEN 'failed'::public.guest_activity_type
          WHEN 'bounced'   THEN 'bounced'::public.guest_activity_type
          ELSE (CASE WHEN _channel = 'email' THEN 'invited_email'::public.guest_activity_type
                     ELSE 'invited_sms'::public.guest_activity_type END)
        END;

        _astatus := CASE LOWER(COALESCE(NEW.status,''))
          WHEN 'failed' THEN 'failure'::public.guest_activity_status
          WHEN 'undelivered' THEN 'failure'::public.guest_activity_status
          WHEN 'bounced' THEN 'failure'::public.guest_activity_status
          WHEN 'queued' THEN 'pending'::public.guest_activity_status
          ELSE 'success'::public.guest_activity_status
        END;

        PERFORM public.log_guest_activity(
          NEW.guest_id, _atype, _channel, _astatus,
          format('%s via %s', COALESCE(NEW.status,'sent'), _channel::text),
          jsonb_build_object('twilio_sid', NEW.twilio_sid, 'to_masked', NEW.to_masked, 'error', NEW.error_message),
          NEW.created_at
        );
        RETURN NEW;
      END;
      $F$;
    $X$;

    DROP TRIGGER IF EXISTS sms_logs_log_activity ON public.sms_send_logs;
    CREATE TRIGGER sms_logs_log_activity
      AFTER INSERT ON public.sms_send_logs
      FOR EACH ROW EXECUTE FUNCTION public.trg_log_sms_activity();
  END IF;
END $$;