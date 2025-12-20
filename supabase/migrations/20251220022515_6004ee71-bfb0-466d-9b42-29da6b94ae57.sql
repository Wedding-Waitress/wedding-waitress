-- Create ceremony_floor_plans table for ceremony seating arrangements
CREATE TABLE IF NOT EXISTS public.ceremony_floor_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  
  -- Layout Configuration
  chairs_per_row INTEGER NOT NULL DEFAULT 5,
  total_rows INTEGER NOT NULL DEFAULT 10,
  assigned_rows INTEGER NOT NULL DEFAULT 3,
  
  -- Side Labels (customizable)
  left_side_label TEXT NOT NULL DEFAULT 'Groom''s Family',
  right_side_label TEXT NOT NULL DEFAULT 'Bride''s Family',
  
  -- Altar Label
  altar_label TEXT NOT NULL DEFAULT 'Altar',
  
  -- Seat Assignments (JSON array)
  -- Format: [{ "side": "left"|"right", "row": 1, "seat": 1, "name": "John Smith" }]
  seat_assignments JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Display Settings
  show_row_numbers BOOLEAN NOT NULL DEFAULT true,
  show_seat_numbers BOOLEAN NOT NULL DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- One floor plan per event
  UNIQUE(event_id)
);

-- Enable Row Level Security
ALTER TABLE public.ceremony_floor_plans ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own ceremony floor plans"
ON public.ceremony_floor_plans
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own ceremony floor plans"
ON public.ceremony_floor_plans
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ceremony floor plans"
ON public.ceremony_floor_plans
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ceremony floor plans"
ON public.ceremony_floor_plans
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_ceremony_floor_plans_updated_at
BEFORE UPDATE ON public.ceremony_floor_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();