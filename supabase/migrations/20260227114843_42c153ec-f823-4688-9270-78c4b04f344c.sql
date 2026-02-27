-- Fix permissive INSERT policy on communication_usage
DROP POLICY "System can insert usage logs" ON public.communication_usage;
CREATE POLICY "Users can insert their own usage logs"
  ON public.communication_usage
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);