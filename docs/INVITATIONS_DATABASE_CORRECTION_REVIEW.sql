-- Applied with explicit user approval, 5 September 2026.
-- Existing hosted project xytxkidpourwdbzzwcdp; preserves rows and RLS.
-- Recorded SQL, not a migration-history file. Do not rerun blindly.
BEGIN;
SET LOCAL lock_timeout = '5s';
DROP INDEX public.invitation_card_settings_event_user_idx;
CREATE INDEX invitation_card_settings_event_user_idx
  ON public.invitation_card_settings (event_id, user_id);
ALTER TABLE public.invitation_card_settings ADD COLUMN notes text NOT NULL DEFAULT '';
COMMIT;
