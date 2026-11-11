CREATE SCHEMA auth;
CREATE SCHEMA private;
CREATE TYPE public.app_role AS ENUM ('admin','user');
CREATE TABLE private.platform_owners(user_id uuid);
CREATE TABLE public.user_roles(user_id uuid, role public.app_role);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
CREATE FUNCTION private.is_platform_owner(_user_id uuid) RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog AS $$ SELECT EXISTS(SELECT FROM private.platform_owners WHERE user_id=_user_id) $$;
CREATE FUNCTION public.has_role(_user_id uuid,_role public.app_role) RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT EXISTS(SELECT FROM public.user_roles r WHERE r.user_id=_user_id AND r.role=_role AND (_role<>'admin'::public.app_role OR private.is_platform_owner(_user_id)))
$$;
CREATE FUNCTION public.is_account_operational(_user_id uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT _user_id <> '30000000-0000-0000-0000-000000000004'::uuid $$;
CREATE TABLE public.guest_update_logs(event_id uuid,guest_id uuid,payload jsonb,changed_by text);
GRANT USAGE ON SCHEMA public,auth TO anon,authenticated;
INSERT INTO public.events(id,user_id,name,slug,qr_apply_to_live_view,date,relation_mode) VALUES
 ('10000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','Fixture','fixture',true,current_date+100,'off'),
 ('10000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000004','Other','other',true,current_date+100,'off');
INSERT INTO public.guests(id,event_id,first_name,last_name,rsvp,email,family_group) VALUES
 ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Recipient','Fixture','Pending','old@example.test','family'),
 ('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','Family','Fixture','Pending','private@example.test','family'),
 ('20000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000002','Other','Fixture','Pending','other@example.test',null);
INSERT INTO public.guest_access_tokens(event_id,guest_id,access_token,expires_at) VALUES
 ('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','recipient-token',now()+interval '1 day'),
 ('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','expired-token',now()-interval '1 day');
INSERT INTO public.user_roles VALUES ('30000000-0000-0000-0000-000000000002','admin'),('30000000-0000-0000-0000-000000000003','admin');
INSERT INTO private.platform_owners VALUES ('30000000-0000-0000-0000-000000000002');
