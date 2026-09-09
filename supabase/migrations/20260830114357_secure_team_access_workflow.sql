-- Secure Team & Access workflow.
--
-- All mutations are performed by the authenticated manage-account-members Edge
-- Function through service-role-only RPCs. Browser clients retain only the
-- minimum SELECT access needed by existing account-role/event-access hooks.

ALTER TABLE public.account_members
  ADD COLUMN IF NOT EXISTS member_email text,
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS mobile text;

ALTER TABLE public.account_invitations
  ADD COLUMN IF NOT EXISTS token_hash text,
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS mobile text;

-- Acceptance is bound to the verified Supabase Auth email, so legacy account
-- bearer tokens are no longer needed and must not remain readable at rest.
UPDATE public.account_invitations
SET token = NULL, token_hash = NULL
WHERE token IS NOT NULL OR token_hash IS NOT NULL;

ALTER TABLE public.account_invitations
  ALTER COLUMN token DROP NOT NULL,
  ALTER COLUMN token DROP DEFAULT;

DROP INDEX IF EXISTS public.idx_account_invitations_token_hash;

UPDATE public.account_invitations
SET status = 'expired'
WHERE status = 'pending' AND expires_at <= now();

WITH ranked_pending AS (
  SELECT id, row_number() OVER (
    PARTITION BY lower(email) ORDER BY created_at DESC, id DESC
  ) AS duplicate_rank
  FROM public.account_invitations
  WHERE status = 'pending'
)
UPDATE public.account_invitations invitation
SET status = 'revoked', token = NULL, token_hash = NULL
FROM ranked_pending ranked
WHERE invitation.id = ranked.id AND ranked.duplicate_rank > 1;

-- An authenticated email can have only one pending account invitation. This
-- lets acceptance bind to the verified Supabase Auth email without putting a
-- second bearer secret in a URL.
CREATE UNIQUE INDEX IF NOT EXISTS idx_account_invitations_pending_email
  ON public.account_invitations(lower(email))
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_account_invitations_owner_status
  ON public.account_invitations(account_owner_id, status, expires_at);

CREATE INDEX IF NOT EXISTS idx_account_members_owner_active
  ON public.account_members(account_owner_id, access_disabled_at)
  WHERE accepted_at IS NOT NULL;

-- There is one immutable master identity per account and one active account per
-- Auth identity. Stop instead of silently repairing contradictory legacy rows.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.account_members
    WHERE role = 'master' AND account_owner_id <> member_user_id
  ) OR EXISTS (
    SELECT account_owner_id FROM public.account_members
    WHERE role = 'master' GROUP BY account_owner_id HAVING count(*) > 1
  ) OR EXISTS (
    SELECT member_user_id FROM public.account_members
    WHERE access_disabled_at IS NULL GROUP BY member_user_id HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Existing account membership data violates the one-master/one-active-account contract';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_account_members_one_master
  ON public.account_members(account_owner_id) WHERE role = 'master';
CREATE UNIQUE INDEX IF NOT EXISTS idx_account_members_one_active_account
  ON public.account_members(member_user_id) WHERE access_disabled_at IS NULL;

-- A browser must never create its own membership, promote a member, bypass the
-- seat limit, or read invitation secrets.
REVOKE ALL ON public.account_invitations FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.account_members FROM anon, authenticated;
GRANT SELECT ON public.account_members TO authenticated;

DROP POLICY IF EXISTS "Owner can manage account members" ON public.account_members;
DROP POLICY IF EXISTS "Member can read own membership" ON public.account_members;
DROP POLICY IF EXISTS "Owner manages invitations" ON public.account_invitations;

CREATE POLICY "Owners read account members"
  ON public.account_members FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = account_owner_id);

CREATE POLICY "Members read own membership"
  ON public.account_members FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = member_user_id);

-- This migration builds the invitation workflow, but the existing application
-- does not yet apply account_event_access(auth.uid(), event_id) consistently to
-- every organiser-owned table/RPC. Keep the feature unavailable at the database
-- boundary until a later, audited account-wide policy migration replaces this
-- function with `SELECT true`.
CREATE OR REPLACE FUNCTION public.internal_team_access_ready()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$ SELECT false $$;

REVOKE ALL ON FUNCTION public.internal_team_access_ready() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.internal_team_access_ready() TO service_role;

-- Create a pending invitation and reserve a seat within the owner's plan limit.
CREATE OR REPLACE FUNCTION public.internal_create_account_invitation(
  p_owner_id uuid,
  p_owner_email text,
  p_email text,
  p_first_name text,
  p_last_name text,
  p_mobile text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  normalized_email text := lower(trim(p_email));
  normalized_owner_email text := lower(trim(p_owner_email));
  normalized_first_name text := regexp_replace(trim(coalesce(p_first_name, '')), '\s+', ' ', 'g');
  normalized_last_name text := regexp_replace(trim(coalesce(p_last_name, '')), '\s+', ' ', 'g');
  normalized_mobile text := regexp_replace(trim(coalesce(p_mobile, '')), '\s+', ' ', 'g');
  invitation public.account_invitations;
  occupied_seats integer;
BEGIN
  IF p_owner_id IS NULL OR normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
    RAISE EXCEPTION 'A valid email address is required' USING ERRCODE = '22023';
  END IF;

  IF normalized_first_name = '' OR length(normalized_first_name) > 80 THEN
    RAISE EXCEPTION 'First name is required' USING ERRCODE = '22023';
  END IF;
  IF normalized_last_name = '' OR length(normalized_last_name) > 80 THEN
    RAISE EXCEPTION 'Last name is required' USING ERRCODE = '22023';
  END IF;
  IF normalized_mobile !~ '^[+()0-9. -]{7,30}$'
     OR length(regexp_replace(normalized_mobile, '[^0-9]', '', 'g')) NOT BETWEEN 7 AND 15 THEN
    RAISE EXCEPTION 'A valid mobile number is required' USING ERRCODE = '22023';
  END IF;

  IF normalized_email = normalized_owner_email THEN
    RAISE EXCEPTION 'The account holder already has access' USING ERRCODE = '23505';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_owner_id::text, 0));

  IF NOT EXISTS (
    SELECT 1 FROM public.account_members
    WHERE account_owner_id = p_owner_id
      AND member_user_id = p_owner_id
      AND role = 'master'
      AND accepted_at IS NOT NULL
      AND access_disabled_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Only the active master account holder can invite users' USING ERRCODE = '42501';
  END IF;

  UPDATE public.account_invitations
  SET status = 'expired'
  WHERE status = 'pending'
    AND lower(email) = normalized_email
    AND expires_at <= now();

  IF EXISTS (
    SELECT 1 FROM public.account_members
    WHERE account_owner_id = p_owner_id
      AND lower(member_email) = normalized_email
      AND access_disabled_at IS NULL
  ) OR EXISTS (
    SELECT 1 FROM public.account_invitations
    WHERE lower(email) = normalized_email
      AND status = 'pending'
      AND expires_at > now()
  ) THEN
    RAISE EXCEPTION 'This person already has access or a pending invitation' USING ERRCODE = '23505';
  END IF;

  SELECT
    (SELECT count(*) FROM public.account_members
      WHERE account_owner_id = p_owner_id
        AND accepted_at IS NOT NULL
        AND access_disabled_at IS NULL)
    +
    (SELECT count(*) FROM public.account_invitations
      WHERE account_owner_id = p_owner_id
        AND status = 'pending'
        AND expires_at > now())
  INTO occupied_seats;

  IF occupied_seats >= 5 THEN
    RAISE EXCEPTION 'All account seats are currently occupied or reserved' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.account_invitations (
    account_owner_id, email, first_name, last_name, mobile,
    role, token, token_hash, expires_at, status
  ) VALUES (
    p_owner_id, normalized_email, normalized_first_name, normalized_last_name,
    normalized_mobile, 'standard', NULL,
    NULL, now() + interval '14 days', 'pending'
  )
  RETURNING * INTO invitation;

  RETURN jsonb_build_object(
    'id', invitation.id,
    'email', invitation.email,
    'first_name', invitation.first_name,
    'last_name', invitation.last_name,
    'mobile', invitation.mobile,
    'expires_at', invitation.expires_at
  );
END;
$$;

-- Return only the pending invitation bound to the caller's verified Auth email.
-- This supports an explicit review screen without granting access early.
CREATE OR REPLACE FUNCTION public.internal_preview_account_invitation(
  p_user_id uuid,
  p_user_email text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  normalized_email text := lower(trim(p_user_email));
  invitation public.account_invitations;
  holder_name text;
  holder_email text;
BEGIN
  IF p_user_id IS NULL OR normalized_email = '' THEN
    RAISE EXCEPTION 'Invalid invitation' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO invitation
  FROM public.account_invitations
  WHERE lower(email) = normalized_email
    AND status = 'pending'
    AND expires_at > now();

  IF invitation.id IS NULL THEN
    RAISE EXCEPTION 'This invitation is invalid, expired, or has already been used' USING ERRCODE = '22023';
  END IF;

  IF invitation.account_owner_id = p_user_id OR EXISTS (
    SELECT 1 FROM public.account_members
    WHERE member_user_id = p_user_id AND role = 'master' AND access_disabled_at IS NULL
  ) THEN
    RAISE EXCEPTION 'A master account holder cannot join another account' USING ERRCODE = '42501';
  END IF;

  SELECT nullif(trim(concat_ws(' ', p.first_name, p.last_name)), ''), p.email
    INTO holder_name, holder_email
  FROM public.profiles p WHERE p.id = invitation.account_owner_id;

  RETURN jsonb_build_object(
    'id', invitation.id,
    'email', invitation.email,
    'first_name', invitation.first_name,
    'last_name', invitation.last_name,
    'mobile', invitation.mobile,
    'created_at', invitation.created_at,
    'expires_at', invitation.expires_at,
    'status', invitation.status,
    'account_holder_name', holder_name,
    'account_holder_email', holder_email
  );
END;
$$;

-- Claiming an invitation is email-bound, expiry-bound, single-use, and cannot
-- replace or demote an account master. The pending invitation has already
-- reserved its seat, while the lock prevents concurrent double acceptance.
CREATE OR REPLACE FUNCTION public.internal_accept_account_invitation(
  p_user_id uuid,
  p_user_email text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  normalized_email text := lower(trim(p_user_email));
  invitation public.account_invitations;
  existing_membership public.account_members;
  occupied_seats integer;
BEGIN
  IF p_user_id IS NULL OR normalized_email = '' THEN
    RAISE EXCEPTION 'Invalid invitation' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO invitation
  FROM public.account_invitations
  WHERE lower(email) = normalized_email
    AND status = 'pending'
  FOR UPDATE;

  IF invitation.id IS NULL OR invitation.status <> 'pending' OR invitation.expires_at <= now() THEN
    RAISE EXCEPTION 'This invitation is invalid, expired, or has already been used' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(invitation.account_owner_id::text, 0));
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text, 1));

  SELECT
    (SELECT count(*) FROM public.account_members
      WHERE account_owner_id = invitation.account_owner_id
        AND accepted_at IS NOT NULL AND access_disabled_at IS NULL)
    +
    (SELECT count(*) FROM public.account_invitations
      WHERE account_owner_id = invitation.account_owner_id
        AND status = 'pending' AND expires_at > now())
  INTO occupied_seats;
  IF occupied_seats > 5 THEN
    RAISE EXCEPTION 'All account seats are currently occupied or reserved' USING ERRCODE = 'P0001';
  END IF;

  IF invitation.account_owner_id = p_user_id OR EXISTS (
    SELECT 1 FROM public.account_members
    WHERE member_user_id = p_user_id
      AND role = 'master'
      AND access_disabled_at IS NULL
  ) THEN
    RAISE EXCEPTION 'A master account holder cannot join another account' USING ERRCODE = '42501';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.account_members
    WHERE member_user_id = p_user_id
      AND account_owner_id <> invitation.account_owner_id
      AND access_disabled_at IS NULL
  ) THEN
    RAISE EXCEPTION 'This user already belongs to another account' USING ERRCODE = '23505';
  END IF;

  SELECT * INTO existing_membership
  FROM public.account_members
  WHERE account_owner_id = invitation.account_owner_id
    AND member_user_id = p_user_id
  FOR UPDATE;

  IF existing_membership.id IS NULL THEN
    INSERT INTO public.account_members (
      account_owner_id, member_user_id, member_email, first_name, last_name, mobile, role, invited_at,
      accepted_at, access_disabled_at
    ) VALUES (
      invitation.account_owner_id, p_user_id, normalized_email,
      invitation.first_name, invitation.last_name, invitation.mobile, 'standard',
      invitation.created_at, now(), NULL
    );
  ELSIF existing_membership.role = 'standard' THEN
    UPDATE public.account_members
    SET member_email = normalized_email,
        first_name = invitation.first_name,
        last_name = invitation.last_name,
        mobile = invitation.mobile,
        invited_at = invitation.created_at,
        accepted_at = now(),
        access_disabled_at = NULL
    WHERE id = existing_membership.id;
  ELSE
    RAISE EXCEPTION 'Master account ownership cannot be changed' USING ERRCODE = '42501';
  END IF;

  UPDATE public.account_invitations
  SET status = 'accepted', accepted_user_id = p_user_id, token = NULL, token_hash = NULL
  WHERE id = invitation.id;

  RETURN jsonb_build_object('account_owner_id', invitation.account_owner_id, 'role', 'standard');
END;
$$;

CREATE OR REPLACE FUNCTION public.internal_revoke_account_invitation(
  p_owner_id uuid,
  p_invitation_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.account_members
    WHERE account_owner_id = p_owner_id AND member_user_id = p_owner_id
      AND role = 'master' AND access_disabled_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Only the master account holder can revoke invitations' USING ERRCODE = '42501';
  END IF;

  UPDATE public.account_invitations
  SET status = 'revoked', token = NULL, token_hash = NULL
  WHERE id = p_invitation_id AND account_owner_id = p_owner_id AND status = 'pending';
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.internal_remove_account_member(
  p_owner_id uuid,
  p_member_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.account_members
    WHERE account_owner_id = p_owner_id AND member_user_id = p_owner_id
      AND role = 'master' AND access_disabled_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Only the master account holder can remove users' USING ERRCODE = '42501';
  END IF;

  UPDATE public.account_members
  SET access_disabled_at = now()
  WHERE id = p_member_id
    AND account_owner_id = p_owner_id
    AND member_user_id <> p_owner_id
    AND role = 'standard'
    AND access_disabled_at IS NULL;
  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.internal_create_account_invitation(uuid, text, text, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.internal_preview_account_invitation(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.internal_accept_account_invitation(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.internal_revoke_account_invitation(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.internal_remove_account_member(uuid, uuid) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.internal_create_account_invitation(uuid, text, text, text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.internal_preview_account_invitation(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.internal_accept_account_invitation(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.internal_revoke_account_invitation(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.internal_remove_account_member(uuid, uuid) TO service_role;
