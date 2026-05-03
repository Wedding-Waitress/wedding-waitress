-- 1) Remove plaintext API credential columns from notification_settings.
-- All values already NULL; encrypted variants (_encrypted) are the only persisted form.
ALTER TABLE public.notification_settings
  DROP COLUMN IF EXISTS resend_api_key,
  DROP COLUMN IF EXISTS twilio_auth_token;

-- 2) Restrict floor_plan_templates INSERT/UPDATE/DELETE to admins only.
DROP POLICY IF EXISTS "Only authenticated users can create templates" ON public.floor_plan_templates;
DROP POLICY IF EXISTS "Admins can create floor plan templates" ON public.floor_plan_templates;
DROP POLICY IF EXISTS "Admins can update floor plan templates" ON public.floor_plan_templates;
DROP POLICY IF EXISTS "Admins can delete floor plan templates" ON public.floor_plan_templates;

CREATE POLICY "Admins can create floor plan templates"
  ON public.floor_plan_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update floor plan templates"
  ON public.floor_plan_templates
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete floor plan templates"
  ON public.floor_plan_templates
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));