-- Create long_table_seat_arrangements table for storing custom seat positions
CREATE TABLE public.long_table_seat_arrangements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  table_id UUID NOT NULL REFERENCES public.tables(id) ON DELETE CASCADE,
  guest_id UUID NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
  side CHAR(1) NOT NULL CHECK (side IN ('A', 'B', 'T', 'E')), -- A=Side A, B=Side B, T=Top end, E=End (bottom)
  position INTEGER NOT NULL, -- Order within that side (1, 2, 3...)
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(table_id, guest_id)
);

-- Enable RLS
ALTER TABLE public.long_table_seat_arrangements ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own seat arrangements"
ON public.long_table_seat_arrangements
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own seat arrangements"
ON public.long_table_seat_arrangements
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own seat arrangements"
ON public.long_table_seat_arrangements
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own seat arrangements"
ON public.long_table_seat_arrangements
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_long_table_seat_arrangements_updated_at
BEFORE UPDATE ON public.long_table_seat_arrangements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();