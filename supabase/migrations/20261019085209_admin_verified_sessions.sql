BEGIN;
CREATE TABLE private.admin_verified_sessions(
 session_id uuid PRIMARY KEY REFERENCES auth.sessions(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 verified_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL,
 CHECK(expires_at>verified_at AND expires_at<=verified_at+interval '10 minutes')
);
ALTER TABLE private.admin_verified_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.admin_verified_sessions FROM PUBLIC,anon,authenticated,service_role;

-- Consume the code and record the verified login session in one locked transaction.
CREATE FUNCTION public.consume_admin_verification_code(p_user uuid,p_session uuid,p_code_hash text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,private,auth AS $$
DECLARE code public.admin_otp_codes; expiry timestamptz;
BEGIN
 IF coalesce(auth.jwt()->>'role','')<>'service_role' THEN RAISE EXCEPTION 'Service role required' USING ERRCODE='42501'; END IF;
 IF private.is_platform_owner(p_user) IS DISTINCT FROM true OR public.has_role(p_user,'admin'::public.app_role) IS DISTINCT FROM true
 OR p_code_hash IS NULL OR p_code_hash !~ '^[a-f0-9]{64}$'
 OR NOT EXISTS(SELECT 1 FROM auth.sessions s JOIN auth.users u ON u.id=s.user_id
  WHERE s.id=p_session AND s.user_id=p_user AND (s.not_after IS NULL OR s.not_after>now())
   AND u.deleted_at IS NULL AND coalesce(u.is_anonymous,false)=false AND u.email_confirmed_at IS NOT NULL)
 THEN RAISE EXCEPTION 'Current platform owner session required' USING ERRCODE='42501'; END IF;
 SELECT * INTO code FROM public.admin_otp_codes WHERE user_id=p_user ORDER BY created_at DESC,id DESC LIMIT 1 FOR UPDATE;
 IF NOT FOUND OR code.consumed_at IS NOT NULL THEN RETURN jsonb_build_object('result','no_active_code'); END IF;
 IF code.expires_at<=now() THEN RETURN jsonb_build_object('result','expired'); END IF;
 IF code.attempts>=5 THEN
  UPDATE public.admin_otp_codes SET consumed_at=now() WHERE id=code.id;
  RETURN jsonb_build_object('result','too_many_attempts');
 END IF;
 IF code.code_hash IS DISTINCT FROM p_code_hash THEN
  UPDATE public.admin_otp_codes SET attempts=attempts+1,
   consumed_at=CASE WHEN attempts+1>=5 THEN now() ELSE consumed_at END WHERE id=code.id;
  RETURN jsonb_build_object('result','invalid_code');
 END IF;
 UPDATE public.admin_otp_codes SET consumed_at=now() WHERE id=code.id;
 expiry:=now()+interval '10 minutes';
 INSERT INTO private.admin_verified_sessions(session_id,user_id,verified_at,expires_at) VALUES(p_session,p_user,now(),expiry)
 ON CONFLICT(session_id) DO UPDATE SET user_id=excluded.user_id,verified_at=excluded.verified_at,expires_at=excluded.expires_at;
 RETURN jsonb_build_object('result','verified','expires_at',expiry);
END $$;
REVOKE ALL ON FUNCTION public.consume_admin_verification_code(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.consume_admin_verification_code(uuid,uuid,text) TO service_role;

CREATE FUNCTION private.require_recent_admin_verification() RETURNS void
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public,private,auth AS $$
BEGIN
 IF private.is_platform_owner(auth.uid()) IS DISTINCT FROM true OR public.is_owner_admin() IS DISTINCT FROM true
 OR NOT EXISTS(SELECT 1 FROM private.admin_verified_sessions v JOIN auth.sessions s ON s.id=v.session_id AND s.user_id=v.user_id
  JOIN auth.users u ON u.id=v.user_id WHERE v.user_id=auth.uid() AND v.session_id::text=auth.jwt()->>'session_id'
   AND v.expires_at>now() AND (s.not_after IS NULL OR s.not_after>now()) AND u.deleted_at IS NULL
   AND coalesce(u.is_anonymous,false)=false AND u.email_confirmed_at IS NOT NULL)
 THEN RAISE EXCEPTION 'Recent administrator verification required' USING ERRCODE='42501'; END IF;
END $$;
REVOKE ALL ON FUNCTION private.require_recent_admin_verification() FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION public.admin_require_verified_session() RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public,private AS $$
BEGIN PERFORM private.require_recent_admin_verification(); RETURN true; END $$;
REVOKE ALL ON FUNCTION public.admin_require_verified_session() FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION public.admin_require_verified_session() TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
