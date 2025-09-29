-- Ensure guests table has full replica identity for realtime
ALTER TABLE public.guests REPLICA IDENTITY FULL;

-- Add guests table to realtime publication (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'guests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.guests;
  END IF;
END $$;

-- Enable live view for the current event
UPDATE public.events 
SET qr_apply_to_live_view = true 
WHERE id = '2d2e5cdb-65a3-4bf5-8a77-00f2e43d6a81';