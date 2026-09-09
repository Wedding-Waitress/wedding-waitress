-- Complete the account-wide Team & Access authorization boundary.
-- This migration is intentionally local/pending until the full release is reviewed.

-- Every established account has exactly one self-owned master membership. A
-- profile created for a pending invite is deliberately excluded until accept.
INSERT INTO public.account_members(account_owner_id, member_user_id, member_email, first_name, last_name, mobile, role, accepted_at)
SELECT p.id, p.id, lower(p.email), p.first_name, p.last_name, p.mobile, 'master', now()
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.account_members am
  WHERE am.member_user_id = p.id AND am.access_disabled_at IS NULL
)
AND NOT EXISTS (
  SELECT 1 FROM public.account_invitations ai
  WHERE lower(ai.email) = lower(p.email) AND ai.status = 'pending' AND ai.expires_at > now()
)
ON CONFLICT (account_owner_id, member_user_id) DO UPDATE
SET member_email = excluded.member_email,
    first_name = coalesce(public.account_members.first_name, excluded.first_name),
    last_name = coalesce(public.account_members.last_name, excluded.last_name),
    mobile = coalesce(public.account_members.mobile, excluded.mobile),
    accepted_at = coalesce(public.account_members.accepted_at, excluded.accepted_at),
    access_disabled_at = NULL;

CREATE OR REPLACE FUNCTION public.ensure_profile_account_master()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.account_invitations ai
    WHERE lower(ai.email) = lower(NEW.email) AND ai.status = 'pending' AND ai.expires_at > now()
  ) THEN
    INSERT INTO public.account_members(account_owner_id, member_user_id, member_email, first_name, last_name, mobile, role, accepted_at)
    VALUES (NEW.id, NEW.id, lower(NEW.email), NEW.first_name, NEW.last_name, NEW.mobile, 'master', now())
    ON CONFLICT (account_owner_id, member_user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.ensure_profile_account_master() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS ensure_profile_account_master_trigger ON public.profiles;
CREATE TRIGGER ensure_profile_account_master_trigger
AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.ensure_profile_account_master();

-- Canonical account/event access. The caller cannot ask this SECURITY DEFINER
-- helper about another identity, and disabled membership stops access on the
-- next statement even when an old JWT remains valid.
CREATE OR REPLACE FUNCTION public.can_access_event(_user_id uuid, _event_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT _user_id IS NOT NULL
    AND _user_id = (SELECT auth.uid())
    AND (
      public.has_role(_user_id, 'admin'::public.app_role)
      OR EXISTS (
        SELECT 1 FROM public.events e
        WHERE e.id = _event_id AND e.user_id = _user_id
          AND public.is_account_operational(_user_id)
      )
      OR EXISTS (
        SELECT 1 FROM public.account_members am
        JOIN public.events e ON e.user_id = am.account_owner_id
        WHERE am.member_user_id = _user_id
          AND am.accepted_at IS NOT NULL
          AND am.access_disabled_at IS NULL
          AND e.id = _event_id
          AND public.is_account_operational(am.account_owner_id)
      )
    );
$$;
REVOKE ALL ON FUNCTION public.can_access_event(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_event(uuid, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.account_event_access(_user_id uuid, _event_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$ SELECT public.can_access_event(_user_id, _event_id) $$;
REVOKE ALL ON FUNCTION public.account_event_access(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.account_event_access(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.is_account_master(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT _user_id IS NOT NULL AND _user_id = (SELECT auth.uid()) AND EXISTS (
    SELECT 1 FROM public.account_members am
    WHERE am.account_owner_id = _user_id AND am.member_user_id = _user_id
      AND am.role = 'master' AND am.accepted_at IS NOT NULL
      AND am.access_disabled_at IS NULL
  )
$$;
REVOKE ALL ON FUNCTION public.is_account_master(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_account_master(uuid) TO authenticated;

-- Event ownership is immutable. Members may plan/update but only the master may
-- create or delete events because those operations change paid account usage.
DROP POLICY IF EXISTS "Users can view their own events" ON public.events;
DROP POLICY IF EXISTS "Users can update their own events" ON public.events;
DROP POLICY IF EXISTS "Users can create their own events" ON public.events;
DROP POLICY IF EXISTS "Master can delete own events" ON public.events;
CREATE POLICY "Account team reads events" ON public.events FOR SELECT TO authenticated
USING (public.can_access_event((SELECT auth.uid()), id));
CREATE POLICY "Account team updates events" ON public.events FOR UPDATE TO authenticated
USING (public.can_access_event((SELECT auth.uid()), id))
WITH CHECK (user_id = COALESCE((SELECT am.account_owner_id FROM public.account_members am
  WHERE am.member_user_id = (SELECT auth.uid()) AND am.accepted_at IS NOT NULL AND am.access_disabled_at IS NULL
  ORDER BY am.invited_at LIMIT 1), (SELECT auth.uid())));
CREATE POLICY "Master creates events" ON public.events FOR INSERT TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()) AND public.is_account_master((SELECT auth.uid())));
CREATE POLICY "Master deletes events" ON public.events FOR DELETE TO authenticated
USING (user_id = (SELECT auth.uid()) AND public.is_account_master((SELECT auth.uid())));

-- Event-scoped rows that carry a legacy user_id always retain the event owner's
-- canonical identity. This prevents a removed member retaining access through
-- an old `user_id = auth.uid()` policy on a row they created.
CREATE OR REPLACE FUNCTION public.canonicalize_event_row_owner()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE event_owner uuid;
BEGIN
  SELECT e.user_id INTO event_owner FROM public.events e WHERE e.id=NEW.event_id;
  IF event_owner IS NULL THEN RAISE EXCEPTION 'Event not found' USING ERRCODE='23503'; END IF;
  NEW.user_id := event_owner;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.canonicalize_event_row_owner() FROM PUBLIC, anon, authenticated;

DO $triggers$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'ceremony_floor_plans','dietary_chart_settings','dj_mc_questionnaires',
    'event_budget_expenses','event_budget_settings','event_media_galleries',
    'floor_plans','full_seating_chart_settings','guests','invitation_card_settings',
    'invitation_designs','long_table_seat_arrangements','place_card_settings',
    'qr_code_settings','qr_design_presets','reception_floor_plans','rsvp_invite_logs',
    'running_sheets','signage_settings','tables','venue_invitations','welcome_video_uploads'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS canonicalize_event_owner ON public.%I', table_name);
    EXECUTE format('CREATE TRIGGER canonicalize_event_owner BEFORE INSERT OR UPDATE OF event_id,user_id ON public.%I FOR EACH ROW EXECUTE FUNCTION public.canonicalize_event_row_owner()', table_name);
  END LOOP;
END $triggers$;

-- Add one explicit policy per operation to every direct event-owned planning
-- table used by the dashboard. Existing public guest/share policies remain.
DO $policy$
DECLARE
  table_name text;
  operation text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'ai_seating_suggestions','ceremony_floor_plans','dietary_chart_settings',
    'dj_mc_questionnaires','event_budget_expenses','event_budget_settings',
    'event_guestbook_messages','event_media_galleries','event_media_items',
    'event_media_limits','event_media_upload_tokens','family_groups','floor_plans',
    'floor_plan_share_tokens','full_seating_chart_settings','guest_activities',
    'guest_addition_notification_preferences','guest_addition_notifications',
    'guest_song_request_settings','guest_song_requests','guests',
    'invitation_card_settings','invitation_designs','live_view_module_settings',
    'live_view_settings','long_table_seat_arrangements','place_card_settings',
    'qr_code_settings','qr_design_presets','reception_collaborator_drafts',
    'reception_floor_plans','rsvp_invite_logs','running_sheets',
    'seating_chart_share_tokens','signage_settings','tables','venue_invitations',
    'welcome_video_uploads'
  ] LOOP
    FOREACH operation IN ARRAY ARRAY['SELECT','INSERT','UPDATE','DELETE'] LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Account team ' || lower(operation) || ' ' || table_name, table_name);
      IF operation = 'INSERT' THEN
        EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (public.can_access_event((SELECT auth.uid()), event_id))', 'Account team insert ' || table_name, table_name);
      ELSIF operation = 'UPDATE' THEN
        EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (public.can_access_event((SELECT auth.uid()), event_id)) WITH CHECK (public.can_access_event((SELECT auth.uid()), event_id))', 'Account team update ' || table_name, table_name);
      ELSE
        EXECUTE format('CREATE POLICY %I ON public.%I FOR %s TO authenticated USING (public.can_access_event((SELECT auth.uid()), event_id))', 'Account team ' || lower(operation) || ' ' || table_name, table_name, operation);
      END IF;
    END LOOP;
  END LOOP;
END $policy$;

-- Supporting event records without a legacy user_id are still bound directly
-- to their event. Audit/scan logs remain read-only; share/access tokens retain
-- only the operations already needed by the organiser workflow.
CREATE POLICY "Account team reads event shortlinks" ON public.event_shortlinks FOR SELECT TO authenticated
USING (public.can_access_event((SELECT auth.uid()), event_id));
CREATE POLICY "Account team creates event shortlinks" ON public.event_shortlinks FOR INSERT TO authenticated
WITH CHECK (public.can_access_event((SELECT auth.uid()), event_id));
CREATE POLICY "Account team updates event shortlinks" ON public.event_shortlinks FOR UPDATE TO authenticated
USING (public.can_access_event((SELECT auth.uid()), event_id))
WITH CHECK (public.can_access_event((SELECT auth.uid()), event_id));
CREATE POLICY "Account team deletes event shortlinks" ON public.event_shortlinks FOR DELETE TO authenticated
USING (public.can_access_event((SELECT auth.uid()), event_id));

CREATE POLICY "Account team reads guest access tokens" ON public.guest_access_tokens FOR SELECT TO authenticated
USING (public.can_access_event((SELECT auth.uid()), event_id));
CREATE POLICY "Account team creates guest access tokens" ON public.guest_access_tokens FOR INSERT TO authenticated
WITH CHECK (public.can_access_event((SELECT auth.uid()), event_id));
CREATE POLICY "Account team deletes guest access tokens" ON public.guest_access_tokens FOR DELETE TO authenticated
USING (public.can_access_event((SELECT auth.uid()), event_id));

CREATE POLICY "Account team reads guest update logs" ON public.guest_update_logs FOR SELECT TO authenticated
USING (public.can_access_event((SELECT auth.uid()), event_id));
CREATE POLICY "Account team reads QR scan logs" ON public.qr_scan_logs FOR SELECT TO authenticated
USING (public.can_access_event((SELECT auth.uid()), event_id));

DROP POLICY IF EXISTS "Users can manage their own dynamic QR codes" ON public.dynamic_qr_codes;
CREATE POLICY "Account team reads event QR codes" ON public.dynamic_qr_codes FOR SELECT TO authenticated
USING (current_event_id IS NULL AND user_id=(SELECT auth.uid()) OR public.can_access_event((SELECT auth.uid()),current_event_id));
CREATE POLICY "Account team inserts event QR codes" ON public.dynamic_qr_codes FOR INSERT TO authenticated
WITH CHECK (public.can_access_event((SELECT auth.uid()),current_event_id));
CREATE POLICY "Account team updates event QR codes" ON public.dynamic_qr_codes FOR UPDATE TO authenticated
USING (public.can_access_event((SELECT auth.uid()),current_event_id))
WITH CHECK (public.can_access_event((SELECT auth.uid()),current_event_id));
CREATE POLICY "Account team deletes event QR codes" ON public.dynamic_qr_codes FOR DELETE TO authenticated
USING (public.can_access_event((SELECT auth.uid()),current_event_id));

CREATE POLICY "Account team reads event media likes" ON public.event_media_likes FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.event_media_items i WHERE i.id=item_id AND public.can_access_event((SELECT auth.uid()),i.event_id)));

-- Parent-bound records use the parent event rather than trusting a client-owned
-- user_id column.
CREATE POLICY "Account team manages running sheet items" ON public.running_sheet_items FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.running_sheets rs WHERE rs.id=sheet_id AND public.can_access_event((SELECT auth.uid()),rs.event_id)))
WITH CHECK (EXISTS (SELECT 1 FROM public.running_sheets rs WHERE rs.id=sheet_id AND public.can_access_event((SELECT auth.uid()),rs.event_id)));
CREATE POLICY "Account team manages running sheet shares" ON public.running_sheet_share_tokens FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.running_sheets rs WHERE rs.id=sheet_id AND public.can_access_event((SELECT auth.uid()),rs.event_id)))
WITH CHECK (EXISTS (SELECT 1 FROM public.running_sheets rs WHERE rs.id=sheet_id AND public.can_access_event((SELECT auth.uid()),rs.event_id)));
CREATE POLICY "Account team manages DJ sections" ON public.dj_mc_sections FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.dj_mc_questionnaires q WHERE q.id=questionnaire_id AND public.can_access_event((SELECT auth.uid()),q.event_id)))
WITH CHECK (EXISTS (SELECT 1 FROM public.dj_mc_questionnaires q WHERE q.id=questionnaire_id AND public.can_access_event((SELECT auth.uid()),q.event_id)));
CREATE POLICY "Account team manages DJ items" ON public.dj_mc_items FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.dj_mc_sections s JOIN public.dj_mc_questionnaires q ON q.id=s.questionnaire_id WHERE s.id=section_id AND public.can_access_event((SELECT auth.uid()),q.event_id)))
WITH CHECK (EXISTS (SELECT 1 FROM public.dj_mc_sections s JOIN public.dj_mc_questionnaires q ON q.id=s.questionnaire_id WHERE s.id=section_id AND public.can_access_event((SELECT auth.uid()),q.event_id)));
CREATE POLICY "Account team manages DJ shares" ON public.dj_mc_share_tokens FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.dj_mc_questionnaires q WHERE q.id=questionnaire_id AND public.can_access_event((SELECT auth.uid()),q.event_id)))
WITH CHECK (EXISTS (SELECT 1 FROM public.dj_mc_questionnaires q WHERE q.id=questionnaire_id AND public.can_access_event((SELECT auth.uid()),q.event_id)));
CREATE POLICY "Account team manages family members" ON public.family_group_members FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.family_groups fg WHERE fg.id=group_id AND public.can_access_event((SELECT auth.uid()),fg.event_id)))
WITH CHECK (EXISTS (SELECT 1 FROM public.family_groups fg JOIN public.guests g ON g.id=guest_id WHERE fg.id=group_id AND g.event_id=fg.event_id AND public.can_access_event((SELECT auth.uid()),fg.event_id)));

-- Ensure the dashboard event list follows the same account-wide boundary.
CREATE OR REPLACE FUNCTION public.get_events_with_guest_count()
RETURNS TABLE(id uuid,user_id uuid,name text,date text,venue text,start_time text,finish_time text,guest_limit integer,created_at text,guests_count bigint,unassigned_guests_count bigint,event_created text,expiry_date text,created_date_local text,expiry_date_local text,event_timezone text,partner1_name text,partner2_name text,slug text,rsvp_deadline text,event_type text,event_id text)
LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  SELECT e.id,e.user_id,e.name,e.date::text,e.venue,e.start_time::text,e.finish_time::text,
    e.guest_limit::integer,e.created_at::text,coalesce(g.guest_count,0),coalesce(g.unassigned_count,0),
    e.event_created::text,e.expiry_date::text,e.created_date_local::text,e.expiry_date_local::text,
    e.event_timezone,e.partner1_name,e.partner2_name,e.slug,e.rsvp_deadline::text,e.event_type,e.event_id
  FROM public.events e LEFT JOIN (
    SELECT event_id ev,count(*) guest_count,count(*) FILTER (WHERE table_id IS NULL) unassigned_count
    FROM public.guests GROUP BY event_id
  ) g ON e.id=g.ev
  WHERE public.can_access_event((SELECT auth.uid()),e.id)
  ORDER BY e.created_at DESC
$$;
REVOKE ALL ON FUNCTION public.get_events_with_guest_count() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_events_with_guest_count() TO authenticated;

-- Event-scoped storage paths use <uploader>/<event-id>/... . Authorization is
-- derived from the event segment, never from the uploader folder, so removing a
-- member immediately removes their management access to files they uploaded.
CREATE OR REPLACE FUNCTION public.safe_uuid(value text)
RETURNS uuid LANGUAGE plpgsql IMMUTABLE SECURITY INVOKER SET search_path='' AS $$
BEGIN RETURN value::uuid; EXCEPTION WHEN invalid_text_representation THEN RETURN NULL; END $$;
REVOKE ALL ON FUNCTION public.safe_uuid(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.safe_uuid(text) TO authenticated;

-- Remove legacy uploader-folder policies that would otherwise be ORed with the
-- event policies below. A removed team member must not retain storage access
-- merely because their Auth id remains the first path segment.
DROP POLICY IF EXISTS "Users can upload their own QR assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own QR assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own QR assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own QR assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to their own live-view-uploads folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own live-view-uploads" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own live-view-uploads" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload to live-view-uploads" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update their uploads in live-view-uploa" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete their uploads in live-view-uploa" ON storage.objects;
DROP POLICY IF EXISTS "Event owners can upload invitations" ON storage.objects;
DROP POLICY IF EXISTS "Event owners can update their invitations" ON storage.objects;
DROP POLICY IF EXISTS "Event owners can delete their invitations" ON storage.objects;
DROP POLICY IF EXISTS "Reception bg owner select" ON storage.objects;
DROP POLICY IF EXISTS "Reception bg owner insert" ON storage.objects;
DROP POLICY IF EXISTS "Reception bg owner update" ON storage.objects;
DROP POLICY IF EXISTS "Reception bg owner delete" ON storage.objects;
DROP POLICY IF EXISTS "branding_insert_owner" ON storage.objects;
DROP POLICY IF EXISTS "branding_update_owner" ON storage.objects;
DROP POLICY IF EXISTS "branding_delete_owner" ON storage.objects;

DO $storage_policies$
DECLARE bucket text; operation text; policy_name text;
BEGIN
  FOREACH bucket IN ARRAY ARRAY['invitations','qr-assets','live-view-uploads','reception-floor-plan-backgrounds','event-media-branding'] LOOP
    FOREACH operation IN ARRAY ARRAY['SELECT','INSERT','UPDATE','DELETE'] LOOP
      policy_name := 'Account team ' || lower(operation) || ' ' || bucket;
      EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', policy_name);
      IF operation = 'INSERT' THEN
        EXECUTE format('CREATE POLICY %I ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id=%L AND public.can_access_event((SELECT auth.uid()), public.safe_uuid((storage.foldername(name))[2])))', policy_name, bucket);
      ELSIF operation = 'UPDATE' THEN
        EXECUTE format('CREATE POLICY %I ON storage.objects FOR UPDATE TO authenticated USING (bucket_id=%L AND public.can_access_event((SELECT auth.uid()), public.safe_uuid((storage.foldername(name))[2]))) WITH CHECK (bucket_id=%L AND public.can_access_event((SELECT auth.uid()), public.safe_uuid((storage.foldername(name))[2])))', policy_name, bucket, bucket);
      ELSE
        EXECUTE format('CREATE POLICY %I ON storage.objects FOR %s TO authenticated USING (bucket_id=%L AND public.can_access_event((SELECT auth.uid()), public.safe_uuid((storage.foldername(name))[2])))', policy_name, operation, bucket);
      END IF;
    END LOOP;
  END LOOP;
END $storage_policies$;

-- Event hero images use <account-owner>/events/<event-id>/..., while setup
-- drafts remain personal to the profile that created them.
DROP POLICY IF EXISTS "Customers read accessible event branding" ON storage.objects;
DROP POLICY IF EXISTS "Customers upload accessible event branding" ON storage.objects;
DROP POLICY IF EXISTS "Customers update accessible event branding" ON storage.objects;
DROP POLICY IF EXISTS "Customers delete accessible event branding" ON storage.objects;
CREATE POLICY "Customers read accessible event branding" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id='event-branding' AND (
  ((storage.foldername(name))[2]='drafts' AND EXISTS (
    SELECT 1 FROM public.onboarding_drafts d
    WHERE d.id::text=(storage.foldername(name))[3]
      AND d.user_id=(SELECT auth.uid())
      AND d.user_id::text=(storage.foldername(name))[1]
  )) OR
  ((storage.foldername(name))[2]='events' AND EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id::text=(storage.foldername(name))[3]
      AND e.user_id::text=(storage.foldername(name))[1]
      AND public.can_access_event((SELECT auth.uid()),e.id)
  ))
));
CREATE POLICY "Customers upload accessible event branding" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id='event-branding' AND (
  ((storage.foldername(name))[2]='drafts' AND EXISTS (
    SELECT 1 FROM public.onboarding_drafts d
    WHERE d.id::text=(storage.foldername(name))[3]
      AND d.user_id=(SELECT auth.uid())
      AND d.user_id::text=(storage.foldername(name))[1]
      AND d.completed_at IS NULL
  )) OR
  ((storage.foldername(name))[2]='events' AND EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id::text=(storage.foldername(name))[3]
      AND e.user_id::text=(storage.foldername(name))[1]
      AND public.can_access_event((SELECT auth.uid()),e.id)
  ))
));
CREATE POLICY "Customers update accessible event branding" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id='event-branding' AND (
  ((storage.foldername(name))[2]='drafts' AND EXISTS (SELECT 1 FROM public.onboarding_drafts d WHERE d.id::text=(storage.foldername(name))[3] AND d.user_id=(SELECT auth.uid()) AND d.user_id::text=(storage.foldername(name))[1] AND d.completed_at IS NULL)) OR
  ((storage.foldername(name))[2]='events' AND EXISTS (SELECT 1 FROM public.events e WHERE e.id::text=(storage.foldername(name))[3] AND e.user_id::text=(storage.foldername(name))[1] AND public.can_access_event((SELECT auth.uid()),e.id)))
))
WITH CHECK (bucket_id='event-branding' AND (
  ((storage.foldername(name))[2]='drafts' AND EXISTS (SELECT 1 FROM public.onboarding_drafts d WHERE d.id::text=(storage.foldername(name))[3] AND d.user_id=(SELECT auth.uid()) AND d.user_id::text=(storage.foldername(name))[1] AND d.completed_at IS NULL)) OR
  ((storage.foldername(name))[2]='events' AND EXISTS (SELECT 1 FROM public.events e WHERE e.id::text=(storage.foldername(name))[3] AND e.user_id::text=(storage.foldername(name))[1] AND public.can_access_event((SELECT auth.uid()),e.id)))
));
CREATE POLICY "Customers delete accessible event branding" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id='event-branding' AND (
  ((storage.foldername(name))[2]='drafts' AND EXISTS (SELECT 1 FROM public.onboarding_drafts d WHERE d.id::text=(storage.foldername(name))[3] AND d.user_id=(SELECT auth.uid()) AND d.user_id::text=(storage.foldername(name))[1])) OR
  ((storage.foldername(name))[2]='events' AND EXISTS (SELECT 1 FROM public.events e WHERE e.id::text=(storage.foldername(name))[3] AND e.user_id::text=(storage.foldername(name))[1] AND public.can_access_event((SELECT auth.uid()),e.id)))
) AND NOT event_branding_private.object_is_referenced(name));

CREATE POLICY "Account team reads DJMC pronunciation recordings" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id='djmc-pronunciations' AND EXISTS (
  SELECT 1 FROM public.dj_mc_items i JOIN public.dj_mc_sections s ON s.id=i.section_id
  JOIN public.dj_mc_questionnaires q ON q.id=s.questionnaire_id
  WHERE i.id::text=(storage.foldername(name))[3]
    AND public.can_access_event((SELECT auth.uid()),q.event_id)
));
CREATE POLICY "Account team uploads DJMC pronunciation recordings" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id='djmc-pronunciations' AND EXISTS (
  SELECT 1 FROM public.dj_mc_items i JOIN public.dj_mc_sections s ON s.id=i.section_id
  JOIN public.dj_mc_questionnaires q ON q.id=s.questionnaire_id
  WHERE i.id::text=(storage.foldername(name))[3]
    AND public.can_access_event((SELECT auth.uid()),q.event_id)
));
CREATE POLICY "Account team deletes DJMC pronunciation recordings" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id='djmc-pronunciations' AND EXISTS (
  SELECT 1 FROM public.dj_mc_items i JOIN public.dj_mc_sections s ON s.id=i.section_id
  JOIN public.dj_mc_questionnaires q ON q.id=s.questionnaire_id
  WHERE i.id::text=(storage.foldername(name))[3]
    AND public.can_access_event((SELECT auth.uid()),q.event_id)
));

CREATE POLICY "Account team reads owned event media" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id='event-media' AND EXISTS (SELECT 1 FROM public.event_media_items i WHERE i.storage_path=name AND public.can_access_event((SELECT auth.uid()),i.event_id)));
CREATE POLICY "Account team deletes owned event media" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id='event-media' AND EXISTS (SELECT 1 FROM public.event_media_items i WHERE i.storage_path=name AND public.can_access_event((SELECT auth.uid()),i.event_id)));

-- The Edge Function checks this only after all account-wide policies exist.
CREATE OR REPLACE FUNCTION public.internal_team_access_ready()
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$ SELECT true $$;
REVOKE ALL ON FUNCTION public.internal_team_access_ready() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.internal_team_access_ready() TO service_role;
