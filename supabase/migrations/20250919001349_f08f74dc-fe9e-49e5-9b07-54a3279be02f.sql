-- Create place_card_settings table for customizable place cards
CREATE TABLE public.place_card_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL,
  user_id UUID NOT NULL,
  font_family TEXT NOT NULL DEFAULT 'Inter',
  font_color TEXT NOT NULL DEFAULT '#000000',
  background_color TEXT NOT NULL DEFAULT '#ffffff',
  background_image_url TEXT,
  background_image_type TEXT NOT NULL DEFAULT 'none' CHECK (background_image_type IN ('none', 'decorative', 'full')),
  mass_message TEXT DEFAULT '',
  individual_messages JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.place_card_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own place card settings" 
ON public.place_card_settings 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own place card settings" 
ON public.place_card_settings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own place card settings" 
ON public.place_card_settings 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own place card settings" 
ON public.place_card_settings 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_place_card_settings_updated_at
BEFORE UPDATE ON public.place_card_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();