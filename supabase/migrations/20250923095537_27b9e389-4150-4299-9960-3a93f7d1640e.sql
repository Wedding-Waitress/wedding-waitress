-- Update floor plan templates RLS policy to require authentication
DROP POLICY IF EXISTS "Templates are viewable by everyone" ON public.floor_plan_templates;

-- Create new policy requiring authentication
CREATE POLICY "Authenticated users can view templates" 
ON public.floor_plan_templates 
FOR SELECT 
TO authenticated 
USING (is_public = true);