DROP POLICY IF EXISTS "Event owners and admins can manage collaborators" ON public.event_collaborators;

CREATE POLICY "Admins can manage collaborators"
ON public.event_collaborators
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));