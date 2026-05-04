
-- ============================================================
-- Security fixes: tighten RLS for purchase/credit/subscription
-- tables and storage buckets
-- ============================================================

-- 1. event_purchases: remove user INSERT (service role only)
DROP POLICY IF EXISTS "Users can create their own event purchases" ON public.event_purchases;

-- 2. rsvp_invite_purchases: remove user INSERT/UPDATE
DROP POLICY IF EXISTS "Users can create their own RSVP purchases" ON public.rsvp_invite_purchases;
DROP POLICY IF EXISTS "Users can update their own RSVP purchases" ON public.rsvp_invite_purchases;

-- 3. user_subscriptions: remove user INSERT/UPDATE
DROP POLICY IF EXISTS "Users can insert their own subscription" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscription" ON public.user_subscriptions;

-- 4. communication_credits: replace ALL policy with SELECT-only
DROP POLICY IF EXISTS "Users can manage their own credits" ON public.communication_credits;
-- "Users can view their own credits" SELECT policy already exists, leave it

-- 5. family_groups: add missing DELETE policy
CREATE POLICY "Users can delete family groups for their events"
  ON public.family_groups
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = family_groups.event_id
      AND events.user_id = auth.uid()
    )
  );

-- 6. exports bucket: add owner-scoped SELECT policy (path: {user_id}/...)
CREATE POLICY "Users can view their own exports"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'exports'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

-- 7. live-view-uploads: replace permissive INSERT/UPDATE/DELETE with path-owner checks
DROP POLICY IF EXISTS "Authenticated users can upload to live-view-uploads" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update their uploads in live-view-uploa" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete their uploads in live-view-uploa" ON storage.objects;

CREATE POLICY "Users can upload to their own live-view-uploads folder"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'live-view-uploads'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own live-view-uploads"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'live-view-uploads'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own live-view-uploads"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'live-view-uploads'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );
