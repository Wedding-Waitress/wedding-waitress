-- Isolated PostgreSQL fixture only. Never run against the application database.
\set ON_ERROR_STOP on
CREATE SCHEMA auth;
CREATE SCHEMA extensions;
CREATE EXTENSION pgcrypto WITH SCHEMA extensions;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT nullif(current_setting('test.actor',true),'')::uuid$$;
CREATE TABLE actors(id uuid PRIMARY KEY,owner_id uuid,is_admin boolean,enabled boolean);
CREATE TYPE public.app_role AS ENUM ('admin');
CREATE FUNCTION public.has_role(u uuid,r public.app_role) RETURNS boolean LANGUAGE sql AS $$SELECT coalesce((SELECT is_admin FROM actors WHERE id=u),false)$$;
CREATE FUNCTION public.current_planning_account_owner() RETURNS uuid LANGUAGE sql AS $$SELECT owner_id FROM actors WHERE id=auth.uid() AND enabled$$;
CREATE TABLE events(id uuid PRIMARY KEY,user_id uuid);
CREATE FUNCTION public.can_access_event(_user_id uuid,_event_id uuid) RETURNS boolean LANGUAGE sql AS $$
SELECT _user_id IS NOT NULL AND _user_id=(SELECT auth.uid()) AND (
 public.has_role(_user_id,'admin'::public.app_role) OR EXISTS (
 SELECT 1 FROM public.events e WHERE e.id=_event_id AND e.user_id=public.current_planning_account_owner()))$$;
CREATE TABLE dj_mc_questionnaires(id uuid PRIMARY KEY,event_id uuid,user_id uuid);
CREATE TABLE running_sheets(LIKE dj_mc_questionnaires INCLUDING ALL);
CREATE TABLE dj_mc_share_tokens(id uuid DEFAULT gen_random_uuid(),questionnaire_id uuid REFERENCES dj_mc_questionnaires(id),token text UNIQUE,permission text,recipient_name text,expires_at timestamptz);
CREATE TABLE running_sheet_share_tokens(id uuid DEFAULT gen_random_uuid(),sheet_id uuid REFERENCES running_sheets(id),token text UNIQUE,permission text,recipient_name text,expires_at timestamptz);
INSERT INTO actors VALUES
 ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001',false,true),
 ('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001',false,true),
 ('00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000003',true,true),
 ('00000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000004',false,true),
 ('00000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000001',false,false);
INSERT INTO events VALUES('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001');
INSERT INTO dj_mc_questionnaires SELECT '20000000-0000-0000-0000-000000000001',id,user_id FROM events;
INSERT INTO running_sheets SELECT * FROM dj_mc_questionnaires;
\ir ../supabase/migrations/20261115083500_align_document_share_event_access.sql
DO $$
DECLARE actor integer; kind text; token_value text; fn text; tab text; actual_permission text; expiry timestamptz;
BEGIN
 FOREACH kind IN ARRAY ARRAY['dj_mc','running_sheet'] LOOP
  fn:='generate_'||kind||'_share_token'; tab:=kind||'_share_tokens';
  FOR actor IN 1..3 LOOP
   PERFORM set_config('test.actor','00000000-0000-0000-0000-'||lpad(actor::text,12,'0'),false);
   EXECUTE format('SELECT public.%I($1)',fn) INTO token_value USING '20000000-0000-0000-0000-000000000001'::uuid;
   IF token_value !~ '^[A-Za-z0-9_-]{43}$' THEN RAISE EXCEPTION 'Bad token format'; END IF;
   EXECUTE format('SELECT permission,expires_at FROM %I WHERE token=$1',tab) INTO actual_permission,expiry USING token_value;
   IF actual_permission<>'view_only' OR expiry<>now()+interval '90 days' THEN RAISE EXCEPTION 'Default permission/expiry changed'; END IF;
   EXECUTE format('SELECT public.%I($1,$2,$3,$4)',fn) INTO token_value USING '20000000-0000-0000-0000-000000000001'::uuid,'can_edit','Synthetic recipient',7;
   EXECUTE format('SELECT permission,expires_at FROM %I WHERE token=$1',tab) INTO actual_permission,expiry USING token_value;
   IF actual_permission<>'can_edit' OR expiry<>now()+interval '7 days' THEN RAISE EXCEPTION 'Explicit permission/expiry changed'; END IF;
  END LOOP;
  FOR actor IN 4..6 LOOP
   PERFORM set_config('test.actor',CASE WHEN actor=6 THEN '' ELSE '00000000-0000-0000-0000-'||lpad(actor::text,12,'0') END,false);
   BEGIN
    EXECUTE format('SELECT public.%I($1)',fn) USING '20000000-0000-0000-0000-000000000001'::uuid;
    RAISE EXCEPTION 'Unexpected access' USING ERRCODE='XX000';
   EXCEPTION WHEN SQLSTATE '42501' OR SQLSTATE 'P0001' THEN NULL;
   END;
  END LOOP;
  PERFORM set_config('test.actor','00000000-0000-0000-0000-000000000003',false);
  BEGIN
   EXECUTE format('SELECT public.%I($1)',fn) USING '20000000-0000-0000-0000-000000000099'::uuid;
   RAISE EXCEPTION 'Missing document accepted' USING ERRCODE='XX000';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN NULL;
  END;
 END LOOP;
 IF (SELECT count(*) FROM dj_mc_share_tokens)<>6 OR (SELECT count(*) FROM running_sheet_share_tokens)<>6 THEN RAISE EXCEPTION 'Unexpected token insert'; END IF;
 RAISE NOTICE 'PASS: both generators allow owner/team/admin; reject outsider/disabled/anonymous/missing; preserve secure tokens, permissions and expiry';
END $$;
