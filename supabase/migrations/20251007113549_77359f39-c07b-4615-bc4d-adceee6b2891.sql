-- Create full_seating_chart_settings table
CREATE TABLE IF NOT EXISTS public.full_seating_chart_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL,
  user_id UUID NOT NULL,
  sort_by TEXT NOT NULL DEFAULT 'firstName',
  font_size TEXT NOT NULL DEFAULT 'medium',
  show_dietary BOOLEAN NOT NULL DEFAULT false,
  show_rsvp BOOLEAN NOT NULL DEFAULT false,
  show_relation BOOLEAN NOT NULL DEFAULT false,
  paper_size TEXT NOT NULL DEFAULT 'A4',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.full_seating_chart_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can create their own full seating chart settings"
ON public.full_seating_chart_settings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own full seating chart settings"
ON public.full_seating_chart_settings
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own full seating chart settings"
ON public.full_seating_chart_settings
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own full seating chart settings"
ON public.full_seating_chart_settings
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_full_seating_chart_settings_updated_at
BEFORE UPDATE ON public.full_seating_chart_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();