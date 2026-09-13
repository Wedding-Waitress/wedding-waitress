-- Data-preserving disablement, never a destructive rollback of customer records.
-- Run only after reverting the dependent application/Edge release. Not applied.
revoke execute on function public.set_my_marketing_preference(boolean) from authenticated;
revoke execute on function public.marketing_email_eligible(uuid,text) from service_role;
revoke execute on function public.unsubscribe_marketing_email(text) from service_role;
revoke execute on function public.record_email_suppression(text,text) from service_role;
revoke execute on function public.create_support_ticket(uuid,uuid,text,text,text,text,text,text,text) from service_role;
revoke execute on function public.admin_set_support_ticket_status(uuid,text,uuid,text) from service_role;
revoke execute on function public.record_email_delivery_event(text,text,text,timestamptz) from service_role;
revoke execute on function public.resolve_email_customer(text,uuid) from service_role;
revoke execute on function public.acknowledge_email_acceptance(bigint,text,text) from service_role;
revoke select on public.marketing_preferences,public.marketing_preference_history,public.support_tickets,public.support_ticket_activity from authenticated;
revoke select(id,customer_id,event_id,full_name,contact_email,category,message,source,status,created_at,updated_at) on public.support_tickets from authenticated;
revoke select(id,message_id,template_name,recipient_email,status,customer_id,event_id,support_ticket_id,purpose,provider,provider_message_id,accepted_at,delivered_at,created_at) on public.email_send_log from authenticated;
-- Keep all tables, foreign keys, history, accepted/delivered evidence and RLS.
