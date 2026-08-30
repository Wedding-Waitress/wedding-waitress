-- Complete the cascade architecture for the older AI/RSVP tables. These were
-- the only event-owned foreign keys created with the default NO ACTION rule.
ALTER TABLE public.reminder_deliveries
  DROP CONSTRAINT IF EXISTS reminder_deliveries_campaign_id_fkey,
  ADD CONSTRAINT reminder_deliveries_campaign_id_fkey
    FOREIGN KEY (campaign_id) REFERENCES public.rsvp_reminder_campaigns(id) ON DELETE CASCADE;

ALTER TABLE public.reminder_deliveries
  DROP CONSTRAINT IF EXISTS reminder_deliveries_guest_id_fkey,
  ADD CONSTRAINT reminder_deliveries_guest_id_fkey
    FOREIGN KEY (guest_id) REFERENCES public.guests(id) ON DELETE CASCADE;

ALTER TABLE public.guest_communication_preferences
  DROP CONSTRAINT IF EXISTS guest_communication_preferences_guest_id_fkey,
  ADD CONSTRAINT guest_communication_preferences_guest_id_fkey
    FOREIGN KEY (guest_id) REFERENCES public.guests(id) ON DELETE CASCADE;

ALTER TABLE public.rsvp_reminder_campaigns
  DROP CONSTRAINT IF EXISTS rsvp_reminder_campaigns_event_id_fkey,
  ADD CONSTRAINT rsvp_reminder_campaigns_event_id_fkey
    FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;

ALTER TABLE public.ai_seating_suggestions
  DROP CONSTRAINT IF EXISTS ai_seating_suggestions_event_id_fkey,
  ADD CONSTRAINT ai_seating_suggestions_event_id_fkey
    FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;

ALTER TABLE public.ai_seating_suggestions
  DROP CONSTRAINT IF EXISTS ai_seating_suggestions_guest_id_fkey,
  ADD CONSTRAINT ai_seating_suggestions_guest_id_fkey
    FOREIGN KEY (guest_id) REFERENCES public.guests(id) ON DELETE CASCADE;

ALTER TABLE public.ai_seating_suggestions
  DROP CONSTRAINT IF EXISTS ai_seating_suggestions_suggested_table_id_fkey,
  ADD CONSTRAINT ai_seating_suggestions_suggested_table_id_fkey
    FOREIGN KEY (suggested_table_id) REFERENCES public.tables(id) ON DELETE CASCADE;

ALTER TABLE public.ai_conversations
  DROP CONSTRAINT IF EXISTS ai_conversations_event_id_fkey,
  ADD CONSTRAINT ai_conversations_event_id_fkey
    FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;

ALTER TABLE public.ai_messages
  DROP CONSTRAINT IF EXISTS ai_messages_conversation_id_fkey,
  ADD CONSTRAINT ai_messages_conversation_id_fkey
    FOREIGN KEY (conversation_id) REFERENCES public.ai_conversations(id) ON DELETE CASCADE;

ALTER TABLE public.ai_knowledge_base
  DROP CONSTRAINT IF EXISTS ai_knowledge_base_event_id_fkey,
  ADD CONSTRAINT ai_knowledge_base_event_id_fkey
    FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;

-- Secure event deletion for genuine event owners, including legacy/free owners
-- that predate the subscription-only account_members master backfill.
CREATE OR REPLACE FUNCTION public.delete_owned_event_secure(p_event_id uuid)
RETURNS TABLE(id uuid, user_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  caller_id uuid := auth.uid();
  deleted_id uuid;
  deleted_owner_id uuid;
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  -- events.user_id is the authoritative owner assigned when an event is
  -- created. Team members and collaborators never satisfy this predicate.
  IF NOT EXISTS (
    SELECT 1
    FROM public.events event_row
    WHERE event_row.id = p_event_id
      AND event_row.user_id = caller_id
  ) THEN
    RAISE EXCEPTION 'Event not found or not owned by the authenticated user'
      USING ERRCODE = '42501';
  END IF;

  IF NOT public.is_account_operational(caller_id) THEN
    RAISE EXCEPTION 'Account is not operational' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.events event_row
  WHERE event_row.id = p_event_id
    AND event_row.user_id = caller_id
  RETURNING event_row.id, event_row.user_id
  INTO deleted_id, deleted_owner_id;

  IF deleted_id IS NULL THEN
    RAISE EXCEPTION 'Event deletion did not affect a row' USING ERRCODE = 'P0002';
  END IF;

  RETURN QUERY SELECT deleted_id, deleted_owner_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_owned_event_secure(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_owned_event_secure(uuid) TO authenticated;
