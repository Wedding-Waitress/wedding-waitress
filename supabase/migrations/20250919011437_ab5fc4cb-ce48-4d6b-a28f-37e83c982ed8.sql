-- Create floor plans table
CREATE TABLE public.floor_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  event_id UUID,
  name TEXT NOT NULL,
  description TEXT,
  canvas_data JSONB NOT NULL DEFAULT '{}',
  settings JSONB DEFAULT '{"width": 800, "height": 600, "gridSize": 20, "showGrid": true, "snapToGrid": true, "measurementUnit": "feet"}',
  room_dimensions JSONB DEFAULT '{"width": 0, "height": 0, "realWidth": 0, "realHeight": 0, "unit": "feet"}',
  is_template BOOLEAN DEFAULT false,
  template_category TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create floor plan templates table
CREATE TABLE public.floor_plan_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  guest_capacity_min INTEGER,
  guest_capacity_max INTEGER,
  preview_image_url TEXT,
  canvas_data JSONB NOT NULL DEFAULT '{}',
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.floor_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.floor_plan_templates ENABLE ROW LEVEL SECURITY;

-- Create policies for floor_plans
CREATE POLICY "Users can view their own floor plans" 
ON public.floor_plans 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own floor plans" 
ON public.floor_plans 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own floor plans" 
ON public.floor_plans 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own floor plans" 
ON public.floor_plans 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create policies for floor_plan_templates
CREATE POLICY "Templates are viewable by everyone" 
ON public.floor_plan_templates 
FOR SELECT 
USING (is_public = true);

CREATE POLICY "Only authenticated users can create templates" 
ON public.floor_plan_templates 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Create function to update timestamps
CREATE TRIGGER update_floor_plans_updated_at
BEFORE UPDATE ON public.floor_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();