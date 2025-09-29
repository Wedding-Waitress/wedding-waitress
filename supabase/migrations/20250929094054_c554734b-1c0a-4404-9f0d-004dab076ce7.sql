-- Enable realtime for guests table to ensure real-time sync between dashboard and QR code app
ALTER TABLE public.guests REPLICA IDENTITY FULL;

-- Add guests table to realtime publication if not already added
DO $$
BEGIN
  -- Check if guests table is already in the publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'guests'
  ) THEN
    -- Add guests table to realtime publication
    ALTER PUBLICATION supabase_realtime ADD TABLE public.guests;
  END IF;
END $$;