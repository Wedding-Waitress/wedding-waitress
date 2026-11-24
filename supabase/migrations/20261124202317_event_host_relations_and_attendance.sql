-- Built-in self roles are available to every relationship picker. Existing
-- event/guest permissions remain authoritative; roles grant no extra access.
ALTER TABLE public.guests DROP CONSTRAINT IF EXISTS check_who_is_role;
ALTER TABLE public.guests ADD CONSTRAINT check_who_is_role CHECK (
  relation_role = '' OR relation_role IN (
    'organizer','bride','groom','bridal_party','father','mother','brother',
    'sister','cousin','uncle','aunty','guest','vendor'
  ) OR relation_role LIKE 'custom_%'
);

-- Extend only the existing role whitelist in authorized guest-edit RPCs.
-- Reuse each complete definition so identity/session/permission checks and
-- grants are preserved. No new public RPC or permission is introduced.
DO $migration$
DECLARE f record;
  old_roles text := $roles$('bridal_party','father','mother','brother','sister','cousin','uncle','aunty','guest','vendor')$roles$;
  new_roles text := $roles$('organizer','bride','groom','bridal_party','father','mother','brother','sister','cousin','uncle','aunty','guest','vendor')$roles$;
BEGIN
  FOR f IN SELECT p.oid FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname IN ('public','private') AND p.prokind='f' AND position(old_roles IN p.prosrc)>0
  LOOP
    EXECUTE replace(pg_get_functiondef(f.oid),old_roles,new_roles);
  END LOOP;
END;
$migration$;

CREATE OR REPLACE FUNCTION private.is_event_host(g public.guests,e public.events)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $function$
  SELECT g.event_id=e.id AND g.user_id=e.user_id AND (
    coalesce(g.relation_role IN ('organizer','bride','groom'),false)
    OR coalesce(g.guided_setup_origin IN ('wedding_couple_1','wedding_couple_2'),false)
    OR (
      -- Durable identities win over names. Legacy two-partner weddings with
      -- no celebration metadata are included; unrelated event types are not.
      (e.setup_details->>'celebrationType'='wedding' OR
        (nullif(e.setup_details->>'celebrationType','') IS NULL AND
          nullif(btrim(e.partner1_name),'') IS NOT NULL AND nullif(btrim(e.partner2_name),'') IS NOT NULL))
      AND (
        g.id::text IN (e.setup_details->'primaryGuestIds'->>'primary_1',e.setup_details->'primaryGuestIds'->>'primary_2')
        OR EXISTS (
          SELECT 1 FROM (VALUES ('primary_1',e.partner1_name),('primary_2',e.partner2_name)) AS partner(key,name)
          WHERE nullif(e.setup_details->'primaryGuestIds'->>partner.key,'') IS NULL
            AND nullif(btrim(partner.name),'') IS NOT NULL
            AND btrim(partner.name) !~* '^(bride|groom|partner\s*[12]|primary\s*[12])$'
            AND lower(regexp_replace(btrim(concat_ws(' ',g.first_name,g.last_name)),'\s+',' ','g')) = lower(regexp_replace(btrim(partner.name),'\s+',' ','g'))
            AND NOT EXISTS (
              SELECT 1 FROM public.guests other WHERE other.event_id=e.id AND other.user_id=e.user_id AND other.id<>g.id
                AND lower(regexp_replace(btrim(concat_ws(' ',other.first_name,other.last_name)),'\s+',' ','g')) = lower(regexp_replace(btrim(partner.name),'\s+',' ','g'))
            )
        )
      )
    )
  );
$function$;
REVOKE ALL ON FUNCTION private.is_event_host(public.guests,public.events) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION private.enforce_event_host_attendance()
-- Internal trigger needs the private helper and a complete same-event view to
-- reject ambiguous identities. The outer write retains all existing RLS/RPC
-- authorization, and this function grants no callable public endpoint.
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $function$
DECLARE e public.events;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.can_access_event(auth.uid(),NEW.event_id) THEN RETURN NEW; END IF;
  SELECT * INTO e FROM public.events WHERE id=NEW.event_id AND user_id=NEW.user_id;
  IF e.id IS NOT NULL AND private.is_event_host(NEW,e) THEN NEW.rsvp:='Attending'; END IF;
  IF NEW.relation_role IN ('organizer','bride','groom') THEN
    NEW.relation_display:=initcap(NEW.relation_role);
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION private.enforce_event_host_attendance() FROM PUBLIC;
DROP TRIGGER IF EXISTS zzzz_event_host_attendance ON public.guests;
CREATE TRIGGER zzzz_event_host_attendance BEFORE INSERT OR UPDATE ON public.guests
FOR EACH ROW EXECUTE FUNCTION private.enforce_event_host_attendance();

CREATE OR REPLACE FUNCTION private.sync_event_host_attendance()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $function$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.can_access_event(auth.uid(),NEW.id) THEN RETURN NEW; END IF;
  UPDATE public.guests g SET rsvp='Attending'
  WHERE g.event_id=NEW.id AND g.user_id=NEW.user_id AND g.rsvp IS DISTINCT FROM 'Attending'
    AND private.is_event_host(g,NEW);
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION private.sync_event_host_attendance() FROM PUBLIC;
DROP TRIGGER IF EXISTS event_host_attendance ON public.events;
CREATE TRIGGER event_host_attendance AFTER UPDATE OF partner1_name,partner2_name,setup_details ON public.events
FOR EACH ROW EXECUTE FUNCTION private.sync_event_host_attendance();

-- Existing events: change only confirmed host RSVP values. Names, relations,
-- invitation delivery, family groups, table IDs and seat numbers are untouched.
UPDATE public.guests g SET rsvp='Attending'
FROM public.events e WHERE e.id=g.event_id AND e.user_id=g.user_id
  AND g.rsvp IS DISTINCT FROM 'Attending' AND private.is_event_host(g,e);
