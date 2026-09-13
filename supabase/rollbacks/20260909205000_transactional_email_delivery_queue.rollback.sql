-- Data-preserving rollback: disable new writes and remove only queue RPCs.
-- Tables and audit/suppression records remain available for recovery.

revoke all on function public.enqueue_email(text, jsonb) from public, anon, authenticated, service_role;
revoke all on function public.claim_transactional_email(bigint) from public, anon, authenticated, service_role;
revoke all on function public.complete_transactional_email(bigint, boolean, text) from public, anon, authenticated, service_role;

drop function if exists public.enqueue_email(text, jsonb);
drop function if exists public.claim_transactional_email(bigint);
drop function if exists public.complete_transactional_email(bigint, boolean, text);

update public.transactional_email_queue
   set status = 'failed',
       last_error = coalesce(last_error, 'Delivery queue rolled back'),
       locked_at = null,
       updated_at = now()
 where status in ('pending', 'processing');
