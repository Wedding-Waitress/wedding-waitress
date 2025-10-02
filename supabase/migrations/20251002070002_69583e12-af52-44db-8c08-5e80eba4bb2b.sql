-- Enable RLS on the guest_access_attempts table
ALTER TABLE public.guest_access_attempts ENABLE ROW LEVEL SECURITY;

-- Only system/event owners can view access attempts
CREATE POLICY "Event owners can view access attempts"
ON public.guest_access_attempts
FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM public.guest_access_tokens gat
    JOIN public.events e ON e.id = gat.event_id
    WHERE gat.access_token = guest_access_attempts.access_token
    AND e.user_id = auth.uid()
  )
);