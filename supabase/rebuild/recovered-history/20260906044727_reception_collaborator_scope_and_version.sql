alter table public.venue_floor_plan_templates add column source_collaborator_link_id uuid references public.floor_plan_share_tokens(id) on delete set null;
create unique index venue_collaborator_room_unique on public.venue_floor_plan_templates(source_collaborator_link_id,lower(room_name)) where source_collaborator_link_id is not null;
create table public.reception_collaborator_contacts(
 link_id uuid primary key references public.floor_plan_share_tokens(id) on delete cascade,
 venue_name text not null, venue_email text not null, venue_phone text not null,
 trial_requested_at timestamptz not null default now(), notified_at timestamptz
);
alter table public.reception_collaborator_contacts enable row level security;
revoke all on public.reception_collaborator_contacts from anon,authenticated;
grant all on public.reception_collaborator_contacts to service_role;
drop function public.save_reception_collaborator_draft(text,jsonb,integer,boolean);
create function public.save_reception_collaborator_draft(_token text,_payload jsonb,_revision integer,_submit boolean,_base timestamptz)
returns jsonb language plpgsql security definer set search_path=public as $$
declare l public.floor_plan_share_tokens; d public.reception_collaborator_drafts; p public.reception_floor_plans;
begin
 select * into l from floor_plan_share_tokens where token=_token and kind='reception' and permission='can_edit' and expires_at>now() for update;
 if not found then raise exception 'Editing permission expired or was revoked'; end if;
 select * into p from reception_floor_plans where event_id=l.event_id and user_id::text=l.user_id::text;
 if not found then raise exception 'Plan unavailable'; end if;
 select * into d from reception_collaborator_drafts where link_id=l.id for update;
 if coalesce(d.revision,0)<>_revision then raise exception 'Draft changed elsewhere. Reload before saving'; end if;
 if d.status is distinct from 'draft' and (_base is null or _base<>p.updated_at) then raise exception 'The couple changed this layout. Reload before starting a new draft'; end if;
 if d.status='submitted' then raise exception 'This draft is awaiting the couple review'; end if;
 insert into reception_collaborator_drafts(link_id,event_id,payload,revision,base_updated_at,status,recipient_name)
 values(l.id,l.event_id,_payload,_revision+1,case when d.status='draft' then d.base_updated_at else p.updated_at end,case when _submit then 'submitted' else 'draft' end,l.recipient_name)
 on conflict(link_id) do update set payload=excluded.payload,revision=excluded.revision,base_updated_at=excluded.base_updated_at,status=excluded.status,updated_at=now(),recipient_name=excluded.recipient_name;
 return jsonb_build_object('revision',_revision+1,'status',case when _submit then 'submitted' else 'draft' end);
end $$;
revoke all on function public.save_reception_collaborator_draft(text,jsonb,integer,boolean,timestamptz) from public,anon,authenticated;
grant execute on function public.save_reception_collaborator_draft(text,jsonb,integer,boolean,timestamptz) to service_role;

