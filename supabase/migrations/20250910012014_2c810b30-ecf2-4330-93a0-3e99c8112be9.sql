-- Create tables table for table management
CREATE TABLE public.tables (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  limit_seats INTEGER NOT NULL CHECK (limit_seats > 0 AND limit_seats <= 30),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own tables" 
ON public.tables 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tables" 
ON public.tables 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tables" 
ON public.tables 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tables" 
ON public.tables 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_tables_updated_at
BEFORE UPDATE ON public.tables
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for fast guest counts by event and table
CREATE INDEX IF NOT EXISTS idx_guests_event_table ON public.guests(event_id, table_no);

-- Add table_id column to guests table for proper foreign key relationship
ALTER TABLE public.guests ADD COLUMN table_id UUID REFERENCES public.tables(id) ON DELETE SET NULL;