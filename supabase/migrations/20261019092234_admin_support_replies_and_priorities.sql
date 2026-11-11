BEGIN;
ALTER TABLE public.support_tickets ADD COLUMN priority text NOT NULL DEFAULT 'normal'
 CHECK(priority IN ('low','normal','high','urgent'));
CREATE TABLE public.support_ticket_replies(
 id uuid PRIMARY KEY,
 ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
 actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
 message text NOT NULL CHECK(length(btrim(message)) BETWEEN 5 AND 5000),
 reason text NOT NULL CHECK(length(btrim(reason)) BETWEEN 5 AND 1000),
 message_id text NOT NULL UNIQUE REFERENCES public.email_send_log(message_id) ON DELETE CASCADE,
 queue_id bigint REFERENCES public.transactional_email_queue(id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX support_ticket_replies_history ON public.support_ticket_replies(ticket_id,created_at DESC,id DESC);
ALTER TABLE public.support_ticket_replies ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.support_ticket_replies FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.support_ticket_replies TO service_role;

CREATE FUNCTION public.admin_set_support_priority(p_ticket uuid,p_actor uuid,p_priority text,p_reason text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,private,auth AS $$
DECLARE ticket public.support_tickets;
BEGIN
 IF coalesce(auth.jwt()->>'role','')<>'service_role' OR private.is_platform_owner(p_actor) IS DISTINCT FROM true
  OR public.has_role(p_actor,'admin'::public.app_role) IS DISTINCT FROM true THEN RAISE EXCEPTION 'Owner service required' USING ERRCODE='42501'; END IF;
 IF p_priority IS NULL OR p_priority NOT IN ('low','normal','high','urgent') OR length(btrim(coalesce(p_reason,''))) NOT BETWEEN 5 AND 1000 THEN RAISE EXCEPTION 'Invalid priority or audit reason' USING ERRCODE='22023'; END IF;
 SELECT * INTO ticket FROM public.support_tickets WHERE id=p_ticket FOR UPDATE;
 IF NOT FOUND THEN RETURN false; END IF;
 IF ticket.priority=p_priority THEN RETURN true; END IF;
 UPDATE public.support_tickets SET priority=p_priority,updated_at=now() WHERE id=p_ticket;
 INSERT INTO public.support_ticket_activity(ticket_id,actor_id,status,reason) VALUES(p_ticket,p_actor,'priority_'||p_priority,btrim(p_reason));
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.admin_set_support_priority(uuid,uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_support_priority(uuid,uuid,text,text) TO service_role;

CREATE FUNCTION public.admin_prepare_support_reply(p_ticket uuid,p_actor uuid,p_reply_id uuid,p_message text,p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,private,auth AS $$
DECLARE ticket public.support_tickets; previous public.support_ticket_replies; message_key text; queue_key bigint; escaped text; recipient text;
BEGIN
 IF coalesce(auth.jwt()->>'role','')<>'service_role' OR private.is_platform_owner(p_actor) IS DISTINCT FROM true
  OR public.has_role(p_actor,'admin'::public.app_role) IS DISTINCT FROM true THEN RAISE EXCEPTION 'Owner service required' USING ERRCODE='42501'; END IF;
 IF p_reply_id IS NULL OR length(btrim(coalesce(p_message,''))) NOT BETWEEN 5 AND 5000 OR length(btrim(coalesce(p_reason,''))) NOT BETWEEN 5 AND 1000 THEN RAISE EXCEPTION 'Invalid support reply or audit reason' USING ERRCODE='22023'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_reply_id::text,0));
 SELECT * INTO previous FROM public.support_ticket_replies WHERE id=p_reply_id;
 IF FOUND THEN
  IF previous.ticket_id IS DISTINCT FROM p_ticket OR previous.actor_id IS DISTINCT FROM p_actor OR previous.message IS DISTINCT FROM btrim(p_message) OR previous.reason IS DISTINCT FROM btrim(p_reason) THEN RAISE EXCEPTION 'Reply request does not match the recorded reply' USING ERRCODE='22023'; END IF;
  RETURN jsonb_build_object('reply_id',previous.id,'queue_id',previous.queue_id,'recorded',true,'duplicate',true,'created_at',previous.created_at,'status',(SELECT status FROM public.email_send_log WHERE message_id=previous.message_id));
 END IF;
 SELECT * INTO ticket FROM public.support_tickets WHERE id=p_ticket FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Support ticket not found' USING ERRCODE='P0002'; END IF;
 recipient:=lower(btrim(ticket.contact_email));
 IF recipient !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' OR length(recipient)>255 THEN RAISE EXCEPTION 'Invalid recorded contact address' USING ERRCODE='22023'; END IF;
 IF EXISTS(SELECT 1 FROM public.suppressed_emails WHERE email=recipient AND reason<>'unsubscribe') THEN RAISE EXCEPTION 'Recipient is suppressed' USING ERRCODE='P0001'; END IF;
 message_key:='support-reply:'||p_reply_id::text;
 escaped:=replace(replace(replace(btrim(p_message),'&','&amp;'),'<','&lt;'),'>','&gt;');
 INSERT INTO public.email_send_log(message_id,template_name,recipient_email,status,customer_id,event_id,support_ticket_id,purpose)
 VALUES(message_key,'admin-support-reply',recipient,'pending',ticket.customer_id,ticket.event_id,ticket.id,'transactional');
 SELECT public.enqueue_email('transactional_emails',jsonb_build_object(
  'message_id',message_key,'to',recipient,'from','Wedding Waitress <support@weddingwaitress.com.au>','reply_to','support@weddingwaitress.com.au',
  'subject','Wedding Waitress — reply to your support enquiry','text',btrim(p_message)||E'\n\nWedding Waitress Support\nsupport@weddingwaitress.com.au',
  'html','<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Wedding Waitress Support</title></head><body><h1>Wedding Waitress Support</h1><p>'||replace(escaped,E'\n','<br>')||'</p><p>Wedding Waitress Support<br>support@weddingwaitress.com.au</p></body></html>',
  'purpose','transactional','label','admin-support-reply','idempotency_key',message_key)) INTO queue_key;
 INSERT INTO public.support_ticket_replies(id,ticket_id,actor_id,message,reason,message_id,queue_id)
 VALUES(p_reply_id,ticket.id,p_actor,btrim(p_message),btrim(p_reason),message_key,queue_key);
 INSERT INTO public.support_ticket_activity(ticket_id,actor_id,status,reason) VALUES(ticket.id,p_actor,'reply_queued',btrim(p_reason));
 RETURN jsonb_build_object('reply_id',p_reply_id,'queue_id',queue_key,'recorded',true,'duplicate',false,'created_at',now(),'status','pending');
END $$;
REVOKE ALL ON FUNCTION public.admin_prepare_support_reply(uuid,uuid,uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_prepare_support_reply(uuid,uuid,uuid,text,text) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
