-- Create events table
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  date DATE,
  venue TEXT,
  start_time TIME,
  finish_time TIME,
  guest_limit INTEGER DEFAULT 50,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own events" 
ON public.events 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own events" 
ON public.events 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own events" 
ON public.events 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own events" 
ON public.events 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create guests table for capacity tracking
CREATE TABLE public.guests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security on guests
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;

-- Create policies for guests
CREATE POLICY "Users can view guests for their events" 
ON public.guests 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create guests for their events" 
ON public.guests 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update guests for their events" 
ON public.guests 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete guests for their events" 
ON public.guests 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create a view to get events with guest count
CREATE VIEW public.events_with_guest_count AS
SELECT 
  e.*,
  COALESCE(g.guest_count, 0) as guests_count
FROM public.events e
LEFT JOIN (
  SELECT event_id, COUNT(*) as guest_count
  FROM public.guests
  GROUP BY event_id
) g ON e.id = g.event_id;