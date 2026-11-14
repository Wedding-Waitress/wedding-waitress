-- Keep concurrent SMS and email invitation links aligned to one durable token.
-- Only trusted Edge Functions may call this helper; public RSVP reads and
-- writes remain constrained by the existing recipient-token RPCs.
create or replace function public.get_or_create_guest_invitation_token(
  _event_id uuid,
  _guest_id uuid,
  _candidate_token text,
  _expires_at timestamptz
)
returns text
language plpgsql
security invoker
set search_path = public
as $$
declare
  _resolved_token text;
begin
  if _candidate_token !~ '^[A-Za-z0-9_-]{43}$' then
    raise exception 'Invalid invitation token format';
  end if;

  if _expires_at <= now() then
    raise exception 'Invitation expiry must be in the future';
  end if;

  if not exists (
    select 1
    from public.guests
    where id = _guest_id
      and event_id = _event_id
  ) then
    raise exception 'Invitation recipient does not belong to this event';
  end if;

  insert into public.guest_access_tokens (
    event_id,
    guest_id,
    access_token,
    expires_at
  ) values (
    _event_id,
    _guest_id,
    _candidate_token,
    _expires_at
  )
  on conflict (event_id, guest_id) do update
  set
    access_token = case
      when public.guest_access_tokens.expires_at > now()
        then public.guest_access_tokens.access_token
      else excluded.access_token
    end,
    expires_at = greatest(public.guest_access_tokens.expires_at, excluded.expires_at)
  returning access_token into _resolved_token;

  return _resolved_token;
end;
$$;

revoke all on function public.get_or_create_guest_invitation_token(uuid, uuid, text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.get_or_create_guest_invitation_token(uuid, uuid, text, timestamptz)
  to service_role;

comment on function public.get_or_create_guest_invitation_token(uuid, uuid, text, timestamptz)
  is 'Atomically returns one durable invitation token per event recipient for trusted delivery functions.';
