-- Enable realtime for the guests table
ALTER TABLE public.guests REPLICA IDENTITY FULL;

-- Add guests table to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.guests;