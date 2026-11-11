-- Video Wishes use the existing event gallery and private event-media bucket.
create table public.video_wishes_settings (
 event_id uuid primary key references public.events(id) on delete cascade,
 enabled boolean not null default false
);
alter table public.video_wishes_settings enable row level security;
create policy "Event managers configure wishes" on public.video_wishes_settings for all to authenticated
 using(public.can_access_event(auth.uid(),event_id)) with check(public.can_access_event(auth.uid(),event_id));
create trigger guard_expired_event_mutation before insert or update or delete on public.video_wishes_settings
 for each row execute function public.guard_expired_event_mutation();

alter table public.event_media_items drop constraint event_media_items_source_category_chk;
alter table public.event_media_items add constraint event_media_items_source_category_chk
 check(source_category in ('guest_upload','photo_booth','guestbook_recording','video_wishes'));
alter table public.event_media_items add column wishes_verified_at timestamptz,
 add column shared_to_slideshow boolean not null default false;

create table public.video_wishes_uploads (
 item_id uuid primary key references public.event_media_items(id) on delete cascade,
 request_id uuid not null unique,
 event_id uuid not null references public.events(id) on delete cascade,
 secret_hash text not null,
 identity_type text not null check(identity_type in ('guest_supplied','invitation_guest','invitation_family')),
 guest_id uuid references public.guests(id) on delete set null,
 invitation_guest_id uuid references public.guests(id) on delete set null,
 family_group text,
 processor_id text,
 processing_started_at timestamptz,
 created_at timestamptz not null default now()
);
alter table public.video_wishes_uploads enable row level security;
-- No public identity/job policies. Edge endpoints disclose only authorised information.
create index video_wishes_uploads_event_idx on public.video_wishes_uploads(event_id);

create or replace function public.event_media_items_set_source_category() returns trigger
 language plpgsql set search_path=public as $$
begin
 if new.source_category='video_wishes' then return new; end if;
 new.source_category := case when new.is_guestbook then 'guestbook_recording'
 when new.is_photo_booth then 'photo_booth' else 'guest_upload' end;
 return new;
end $$;

create function public.guard_video_wishes_media() returns trigger language plpgsql
 set search_path=public as $$
begin
 if tg_op='UPDATE' and old.source_category='video_wishes' and new.source_category<>'video_wishes' then
   raise exception 'Video Wishes category cannot be changed';
 end if;
 if new.source_category <> 'video_wishes' then return new; end if;
 if auth.role() is distinct from 'service_role' then
   if tg_op='INSERT' then raise exception 'Use the Video Wishes upload service'; end if;
   if not public.can_access_event(auth.uid(),new.event_id) then raise exception 'Not authorised'; end if;
   if (to_jsonb(new)-array['shared_to_gallery','shared_to_slideshow','moderation_status']) is distinct from
      (to_jsonb(old)-array['shared_to_gallery','shared_to_slideshow','moderation_status']) then
     raise exception 'Verified Video Wishes media is immutable';
   end if;
 end if;
 if new.kind <> 'video' or new.is_guestbook or new.is_photo_booth then raise exception 'Videos only'; end if;
 if new.upload_status='uploaded' and new.wishes_verified_at is null then raise exception 'Video verification required'; end if;
 if new.wishes_verified_at is null and (new.shared_to_gallery or new.shared_to_slideshow) then
   raise exception 'Verify the video before sharing';
 end if;
 return new;
end $$;
create trigger zz_guard_video_wishes before insert or update on public.event_media_items
 for each row execute function public.guard_video_wishes_media();

create function public.video_wishes_available(_event_id uuid) returns boolean language sql stable security definer
 set search_path=public as $$
 select exists(select 1 from video_wishes_settings s join events e on e.id=s.event_id
 join event_media_galleries g on g.event_id=e.id where s.event_id=_event_id and s.enabled and g.is_open
 and public.is_account_operational(e.user_id) and public.subscription_allows_event_edit(e.user_id));
$$;
revoke all on function public.video_wishes_available(uuid) from public;
grant execute on function public.video_wishes_available(uuid) to anon,authenticated,service_role;

create function public.reserve_video_wish(_event_id uuid,_request_id uuid,_secret_hash text,
 _mime text,_bytes bigint,_sender jsonb) returns public.event_media_items
 language plpgsql security definer set search_path=public as $$
declare g event_media_galleries; lim event_media_limits; result event_media_items;
 total bigint; videos bigint; uid uuid := gen_random_uuid();
begin
 if auth.role() is distinct from 'service_role' then raise exception 'Service only'; end if;
 perform pg_advisory_xact_lock(hashtextextended(_event_id::text,921));
 select i.* into result from event_media_items i join video_wishes_uploads w on w.item_id=i.id
 where w.request_id=_request_id and w.secret_hash=_secret_hash and w.event_id=_event_id;
 if found then return result; end if;
 if not video_wishes_available(_event_id) then raise exception 'Video Wishes unavailable'; end if;
 select * into g from event_media_galleries where event_id=_event_id for update;
 select * into lim from event_media_limits where event_id=_event_id;
 if lim.event_id is null or _bytes<1 or _bytes>least(lim.max_video_bytes,104857600)
 or _mime not in ('video/mp4','video/webm','video/quicktime') then raise exception 'Invalid video type or size'; end if;
 select coalesce(sum(byte_size),0),count(*) filter(where kind='video') into total,videos
 from event_media_items where event_id=_event_id and
 (upload_status='uploaded' or (upload_status='pending' and upload_token_expires_at>now()));
 if videos>=lim.max_videos or total+_bytes>lim.max_total_bytes then raise exception 'Event storage limit reached'; end if;
 insert into event_media_items(id,event_id,gallery_id,storage_path,kind,mime_type,byte_size,uploader_name,
 source_category,album,upload_status,moderation_status,shared_to_gallery,shared_to_slideshow,upload_token_expires_at)
 values(uid,_event_id,g.id,_event_id::text||'/'||uid::text||case _mime when 'video/mp4' then '.mp4' when 'video/webm' then '.webm' else '.mov' end,
 'video',_mime,_bytes,_sender->>'name','video_wishes','Other','pending','hidden',false,false,now()+interval '1 hour') returning * into result;
 insert into video_wishes_uploads(item_id,request_id,event_id,secret_hash,identity_type,guest_id,invitation_guest_id,family_group)
 values(uid,_request_id,_event_id,_secret_hash,_sender->>'identity_type',(_sender->>'guest_id')::uuid,(_sender->>'invitation_guest_id')::uuid,_sender->>'family_group');
 return result;
end $$;
revoke all on function public.reserve_video_wish(uuid,uuid,text,text,bigint,jsonb) from public,anon,authenticated;
grant execute on function public.reserve_video_wish(uuid,uuid,text,text,bigint,jsonb) to service_role;

-- This endpoint supplements the existing feed, without exposing private wishes in legacy RPCs.
create function public.get_shared_video_wishes(_token text,_slideshow boolean default false)
 returns setof public.event_media_items language sql stable security definer set search_path=public as $$
 select i.* from event_media_items i join event_media_galleries g on g.id=i.gallery_id
 join event_media_upload_tokens t on t.gallery_id=g.id
 where t.token=_token and (t.expires_at is null or t.expires_at>now()) and g.is_open
 and i.source_category='video_wishes' and i.upload_status='uploaded' and i.wishes_verified_at is not null
 and i.moderation_status='approved'
 and case when _slideshow then i.shared_to_slideshow and g.slideshow_enabled else i.shared_to_gallery and g.gallery_view_enabled end
 and public.is_account_operational(g.user_id);
$$;
-- Only the password-checking edge feed may use this function.
revoke all on function public.get_shared_video_wishes(text,boolean) from public,anon,authenticated;
grant execute on function public.get_shared_video_wishes(text,boolean) to service_role;

create function public.get_video_wishes_attribution(_event_id uuid) returns table(item_id uuid,identity_type text)
 language sql stable security definer set search_path=public as $$
 select w.item_id,w.identity_type from video_wishes_uploads w where w.event_id=_event_id and can_access_event(auth.uid(),_event_id);
$$;
revoke all on function public.get_video_wishes_attribution(uuid) from public,anon;
grant execute on function public.get_video_wishes_attribution(uuid) to authenticated;
