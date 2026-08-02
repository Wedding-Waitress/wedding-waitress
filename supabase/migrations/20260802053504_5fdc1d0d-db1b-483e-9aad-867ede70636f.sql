REVOKE SELECT ON public.event_guestbook_messages FROM anon;
REVOKE SELECT ON public.event_media_items FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_guestbook_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_media_items TO authenticated;
GRANT ALL ON public.event_guestbook_messages TO service_role;
GRANT ALL ON public.event_media_items TO service_role;

DROP POLICY IF EXISTS owner_all_items ON public.event_media_items;
CREATE POLICY owner_all_items ON public.event_media_items
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_media_items.event_id AND e.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_media_items.event_id AND e.user_id = auth.uid()));