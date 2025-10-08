-- Create dietary chart settings table
CREATE TABLE public.dietary_chart_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL,
  user_id UUID NOT NULL,
  sort_by TEXT NOT NULL DEFAULT 'firstName',
  font_size TEXT NOT NULL DEFAULT 'medium',
  show_mobile BOOLEAN NOT NULL DEFAULT true,
  show_relation BOOLEAN NOT NULL DEFAULT true,
  show_seat_no BOOLEAN NOT NULL DEFAULT true,
  show_logo BOOLEAN NOT NULL DEFAULT true,
  paper_size TEXT NOT NULL DEFAULT 'A4',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE public.dietary_chart_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can create their own dietary chart settings" 
ON public.dietary_chart_settings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own dietary chart settings" 
ON public.dietary_chart_settings 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own dietary chart settings" 
ON public.dietary_chart_settings 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own dietary chart settings" 
ON public.dietary_chart_settings 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_dietary_chart_settings_updated_at
BEFORE UPDATE ON public.dietary_chart_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();