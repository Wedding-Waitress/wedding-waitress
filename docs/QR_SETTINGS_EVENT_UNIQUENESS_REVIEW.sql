-- Approved by Nader and applied on 2026-09-05 via qr_settings_event_uniqueness.
-- Target: Supabase project xytxkidpourwdbzzwcdp used by localhost.
-- Observed 2026-09-05: qr_code_settings has 0 rows and only its ID primary key.
-- QRCodeMainCard upserts with onConflict: 'event_id', which fails with 42P10.
-- This enforces the existing one-QR-design-per-event model; no record changes.

BEGIN;
SET LOCAL lock_timeout = '5s';

DO $$
BEGIN
  IF EXISTS (
    SELECT event_id FROM public.qr_code_settings
    WHERE event_id IS NOT NULL
    GROUP BY event_id HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate QR settings exist; review them without deleting data';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.qr_code_settings'::regclass
      AND conname = 'qr_code_settings_event_id_key'
  ) THEN
    ALTER TABLE public.qr_code_settings
      ADD CONSTRAINT qr_code_settings_event_id_key UNIQUE (event_id);
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
COMMIT;

-- After approval/application: save a test QR design from localhost, reload it,
-- and verify exactly one settings row for Wendy & Tom's test event.
-- The editor must also load saved settings before starting its autosave effect.
-- Rollback, only if needed and approved:
-- ALTER TABLE public.qr_code_settings DROP CONSTRAINT qr_code_settings_event_id_key;
