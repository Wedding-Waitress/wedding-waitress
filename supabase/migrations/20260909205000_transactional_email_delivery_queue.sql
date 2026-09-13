-- Transactional email suppression, audit, and service-role-only delivery queue.
-- This migration contains no provider credentials and exposes no email data to
-- anon or authenticated roles.

create table if not exists public.suppressed_emails (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  reason text not null check (reason in ('bounce', 'complaint', 'unsubscribe')),
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (email = lower(btrim(email)) and email like '%@%')
);

create table if not exists public.email_unsubscribe_tokens (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  token text not null unique,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  check (email = lower(btrim(email)) and email like '%@%'),
  check (length(token) >= 32)
);

create table if not exists public.email_send_log (
  id uuid primary key default gen_random_uuid(),
  message_id text,
  template_name text not null,
  recipient_email text not null,
  status text not null check (status in ('pending', 'sent', 'failed', 'suppressed', 'bounced', 'complained')),
  error_message text,
  metadata jsonb,
  created_at timestamptz not null default now(),
  check (recipient_email like '%@%')
);

create index if not exists email_send_log_message_id_idx
  on public.email_send_log(message_id);
create index if not exists email_send_log_recipient_created_idx
  on public.email_send_log(recipient_email, created_at desc);

create table if not exists public.transactional_email_queue (
  id bigint generated always as identity primary key,
  queue_name text not null,
  idempotency_key text not null,
  payload jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'sent', 'failed')),
  attempts integer not null default 0 check (attempts between 0 and 5),
  available_at timestamptz not null default now(),
  locked_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint transactional_email_queue_idempotency_unique unique (queue_name, idempotency_key),
  check (length(btrim(queue_name)) between 1 and 80),
  check (length(btrim(idempotency_key)) between 1 and 200)
);

create index if not exists transactional_email_queue_ready_idx
  on public.transactional_email_queue(status, available_at, id)
  where status in ('pending', 'failed');

alter table public.suppressed_emails enable row level security;
alter table public.email_unsubscribe_tokens enable row level security;
alter table public.email_send_log enable row level security;
alter table public.transactional_email_queue enable row level security;

revoke all on public.suppressed_emails from anon, authenticated;
revoke all on public.email_unsubscribe_tokens from anon, authenticated;
revoke all on public.email_send_log from anon, authenticated;
revoke all on public.transactional_email_queue from anon, authenticated;
grant all on public.suppressed_emails to service_role;
grant all on public.email_unsubscribe_tokens to service_role;
grant all on public.email_send_log to service_role;
grant all on public.transactional_email_queue to service_role;
grant usage, select on sequence public.transactional_email_queue_id_seq to service_role;

create or replace function public.enqueue_email(queue_name text, payload jsonb)
returns bigint
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  queue_id bigint;
  requested_queue_name text := btrim(coalesce(queue_name, ''));
  requested_payload jsonb := payload;
  key_value text := btrim(coalesce(payload->>'idempotency_key', ''));
begin
  if requested_queue_name = '' or key_value = '' then
    raise exception 'Queue name and idempotency key are required' using errcode = '22023';
  end if;
  if jsonb_typeof(requested_payload) <> 'object' or coalesce(requested_payload->>'to', '') = ''
     or coalesce(requested_payload->>'subject', '') = '' or coalesce(requested_payload->>'html', '') = '' then
    raise exception 'Invalid transactional email payload' using errcode = '22023';
  end if;

  insert into public.transactional_email_queue (queue_name, idempotency_key, payload)
  values (requested_queue_name, key_value, requested_payload)
  on conflict on constraint transactional_email_queue_idempotency_unique do update
    set updated_at = public.transactional_email_queue.updated_at
  returning id into queue_id;
  return queue_id;
end;
$$;

create or replace function public.claim_transactional_email(p_queue_id bigint)
returns table(id bigint, payload jsonb, attempts integer)
language sql
security definer
set search_path = pg_catalog, public
as $$
  update public.transactional_email_queue q
     set status = 'processing', attempts = q.attempts + 1,
         locked_at = now(), updated_at = now(), last_error = null
   where q.id = p_queue_id
     and q.status in ('pending', 'failed')
     and q.available_at <= now()
     and q.attempts < 5
  returning q.id, q.payload, q.attempts;
$$;

create or replace function public.complete_transactional_email(
  p_queue_id bigint,
  p_success boolean,
  p_error text default null
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  update public.transactional_email_queue
     set status = case when p_success then 'sent' else 'failed' end,
         last_error = case when p_success then null else left(coalesce(p_error, 'Delivery failed'), 1000) end,
         locked_at = null,
         available_at = case when p_success then available_at else now() + interval '5 minutes' end,
         updated_at = now()
   where id = p_queue_id and status = 'processing';
  return found;
end;
$$;

revoke all on function public.enqueue_email(text, jsonb) from public, anon, authenticated;
revoke all on function public.claim_transactional_email(bigint) from public, anon, authenticated;
revoke all on function public.complete_transactional_email(bigint, boolean, text) from public, anon, authenticated;
grant execute on function public.enqueue_email(text, jsonb) to service_role;
grant execute on function public.claim_transactional_email(bigint) to service_role;
grant execute on function public.complete_transactional_email(bigint, boolean, text) to service_role;
