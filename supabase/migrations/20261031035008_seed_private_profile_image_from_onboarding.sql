-- Prospective first-event handoff only. No customer/profile backfill.
BEGIN;
ALTER TABLE public.onboarding_drafts ADD COLUMN profile_image_seed_resolved_at timestamptz;
CREATE FUNCTION public.seed_onboarding_profile_image(p_draft_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $function$
DECLARE
  actor uuid := auth.uid();
  draft public.onboarding_drafts;
  profile public.profiles;
  image storage.objects;
  target_path text;
  source_path text;
BEGIN
  IF actor IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
  SELECT * INTO draft FROM public.onboarding_drafts WHERE id=p_draft_id AND user_id=actor FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Setup draft unavailable' USING ERRCODE='42501'; END IF;
  IF draft.mode <> 'first_event' OR draft.completed_at IS NOT NULL OR draft.profile_image_seed_resolved_at IS NOT NULL THEN
    RETURN jsonb_build_object('status','skipped');
  END IF;
  source_path := nullif(draft.answers->>'eventImagePath','');
  IF source_path IS NULL THEN RETURN jsonb_build_object('status','skipped'); END IF;
  IF split_part(source_path,'/',1) <> actor::text OR split_part(source_path,'/',2) NOT IN ('drafts','events') THEN
    RAISE EXCEPTION 'Photo does not belong to this account' USING ERRCODE='42501';
  END IF;
  SELECT * INTO profile FROM public.profiles WHERE id=actor FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Account profile unavailable' USING ERRCODE='42501'; END IF;
  IF profile.profile_image_path IS NOT NULL THEN
    UPDATE public.onboarding_drafts SET profile_image_seed_resolved_at=clock_timestamp() WHERE id=draft.id;
    RETURN jsonb_build_object('status','preserved');
  END IF;
  target_path := actor::text || '/profile-image';
  SELECT * INTO image FROM storage.objects WHERE bucket_id='profile-images' AND name=target_path FOR SHARE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status','copy_required','source_path',source_path,'target_path',target_path);
  END IF;
  IF image.user_metadata->>'onboarding_draft_id' IS DISTINCT FROM draft.id::text
    OR image.user_metadata->>'source_path' IS DISTINCT FROM source_path THEN
    -- An independent profile upload/removal wins, including an in-flight upload.
    UPDATE public.onboarding_drafts SET profile_image_seed_resolved_at=clock_timestamp() WHERE id=draft.id;
    RETURN jsonb_build_object('status','preserved');
  END IF;
  UPDATE public.profiles SET
    profile_image_path=target_path,
    profile_image_fit=CASE WHEN draft.answers->>'eventImageFit'='contain' THEN 'contain' ELSE 'cover' END,
    profile_image_position_x=round(least(100,greatest(0,coalesce((draft.answers->>'eventImagePositionX')::numeric,50))))::smallint,
    profile_image_position_y=round(least(100,greatest(0,coalesce((draft.answers->>'eventImagePositionY')::numeric,50))))::smallint
  WHERE id=actor AND profile_image_path IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Profile photo could not be saved'; END IF;
  UPDATE public.onboarding_drafts SET profile_image_seed_resolved_at=clock_timestamp() WHERE id=draft.id;
  RETURN jsonb_build_object('status','seeded','target_path',target_path);
END $function$;
REVOKE ALL ON FUNCTION public.seed_onboarding_profile_image(uuid) FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION public.seed_onboarding_profile_image(uuid) TO authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
