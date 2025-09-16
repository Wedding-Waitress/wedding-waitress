-- Extend qr_code_settings table with advanced customization options
ALTER TABLE public.qr_code_settings 
ADD COLUMN IF NOT EXISTS pattern_style text DEFAULT 'basic',
ADD COLUMN IF NOT EXISTS gradient_type text DEFAULT 'none',
ADD COLUMN IF NOT EXISTS gradient_colors jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS border_style text DEFAULT 'none',
ADD COLUMN IF NOT EXISTS border_width integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS border_color text DEFAULT '#000000',
ADD COLUMN IF NOT EXISTS shadow_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS shadow_blur integer DEFAULT 10,
ADD COLUMN IF NOT EXISTS shadow_color text DEFAULT '#00000033',
ADD COLUMN IF NOT EXISTS center_image_size integer DEFAULT 80,
ADD COLUMN IF NOT EXISTS background_opacity decimal DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS output_size integer DEFAULT 512,
ADD COLUMN IF NOT EXISTS output_format text DEFAULT 'png',
ADD COLUMN IF NOT EXISTS color_palette text DEFAULT 'default',
ADD COLUMN IF NOT EXISTS advanced_settings jsonb DEFAULT '{}'::jsonb;

-- Create storage bucket for QR code assets (logos, backgrounds)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('qr-assets', 'qr-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Create policies for QR assets storage
CREATE POLICY IF NOT EXISTS "Users can upload their own QR assets" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'qr-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY IF NOT EXISTS "Users can view their own QR assets" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'qr-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY IF NOT EXISTS "Users can update their own QR assets" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'qr-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY IF NOT EXISTS "Users can delete their own QR assets" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'qr-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY IF NOT EXISTS "QR assets are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'qr-assets');

-- Add trigger for qr_code_settings updated_at
CREATE TRIGGER IF NOT EXISTS update_qr_code_settings_updated_at
  BEFORE UPDATE ON public.qr_code_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();