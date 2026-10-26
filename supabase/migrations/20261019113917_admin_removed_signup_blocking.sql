BEGIN;
CREATE TABLE private.removed_signup_block_key(singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton), pepper text NOT NULL);
INSERT INTO private.removed_signup_block_key VALUES(true,gen_random_uuid()::text||gen_random_uuid()::text);
CREATE TABLE private.removed_signup_blocks(email_fingerprint bytea PRIMARY KEY,blocked_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE private.removed_signup_block_key ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.removed_signup_blocks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.removed_signup_block_key,private.removed_signup_blocks FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION private.removed_signup_email_blocked(p_email text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,private AS $$
 SELECT EXISTS(SELECT 1 FROM private.removed_signup_blocks b CROSS JOIN private.removed_signup_block_key k
 WHERE nullif(btrim(p_email),'') IS NOT NULL AND b.email_fingerprint=sha256(convert_to(lower(btrim(p_email))||k.pepper,'UTF8')))
$$;
REVOKE ALL ON FUNCTION private.removed_signup_email_blocked(text) FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION private.guard_removed_signup_identity() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,private AS $$
BEGIN
 IF private.removed_signup_email_blocked(NEW.email) THEN RAISE EXCEPTION 'Registration is unavailable. Please contact Wedding Waitress support.' USING ERRCODE='42501'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.guard_removed_signup_identity() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER guard_removed_signup_identity BEFORE INSERT OR UPDATE OF email ON auth.users FOR EACH ROW EXECUTE FUNCTION private.guard_removed_signup_identity();

-- Historical one-time identity cleanup is retired from replay.
-- Its approved targets were specific to the original production execution.
-- Preserve signup-blocking schema without deleting identities or customer data.
SELECT 1;
COMMIT;


