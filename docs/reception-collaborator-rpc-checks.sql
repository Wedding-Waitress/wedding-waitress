
begin;
create temporary table events(id uuid,user_id text);
create temporary table floor_plan_share_tokens(id uuid,event_id uuid,user_id uuid,token text,kind text,permission text,expires_at timestamptz,recipient_name text);
create temporary table reception_floor_plans(id uuid,event_id uuid,user_id uuid,updated_at timestamptz,table_positions jsonb,fixtures jsonb,vendor_notes text,manual_placement boolean,background_x numeric,background_y numeric,background_width numeric,background_height numeric,background_rotation numeric,background_opacity numeric,background_locked boolean,background_visible boolean,last_saved_at timestamptz,background_image_url text,room_width_m numeric);
create temporary table reception_collaborator_drafts(link_id uuid primary key,event_id uuid,payload jsonb,revision integer,base_updated_at timestamptz,updated_at timestamptz default now(),status text,recipient_name text);
do $clone$
declare def text;
begin
 select pg_get_functiondef('public.save_reception_collaborator_draft(text,jsonb,integer,boolean,timestamptz)'::regprocedure) into def;
 execute replace(def,'public','pg_temp');
 select pg_get_functiondef('public.review_reception_collaborator_draft(uuid,integer,boolean)'::regprocedure) into def;
 execute replace(def,'public','pg_temp');
end $clone$;
do $test$
declare uid uuid=gen_random_uuid(); eid uuid=gen_random_uuid(); lid uuid=gen_random_uuid(); pid uuid=gen_random_uuid();
 b timestamptz='2026-01-01'; payload jsonb='{"table_positions":[],"fixtures":[],"vendor_notes":"proposed","manual_placement":true,"background":{"x":1,"y":2,"width":20,"height":35,"rotation":90,"opacity":1,"locked":false,"visible":true}}';
 blocked boolean;
begin
 insert into pg_temp.events values(eid,uid::text);
 insert into pg_temp.reception_floor_plans(id,event_id,user_id,updated_at,vendor_notes,background_image_url,room_width_m) values(pid,eid,uid,b,'original','private-path',20);
 insert into pg_temp.floor_plan_share_tokens values(lid,eid,uid,'test','reception','view_only',now()+interval '1 hour','Preview');
 blocked=false;begin perform pg_temp.save_reception_collaborator_draft('test',payload,0,false,b);exception when others then blocked=true;end;if not blocked then raise exception 'View-only save allowed';end if;
 update pg_temp.floor_plan_share_tokens set permission='can_edit',kind='ceremony';
 blocked=false;begin perform pg_temp.save_reception_collaborator_draft('test',payload,0,false,b);exception when others then blocked=true;end;if not blocked then raise exception 'Ceremony save allowed';end if;
 update pg_temp.floor_plan_share_tokens set kind='reception';
 blocked=false;begin perform pg_temp.save_reception_collaborator_draft('test',payload,0,false,b-interval '1 minute');exception when others then blocked=true;end;if not blocked then raise exception 'Stale initial draft allowed';end if;
 perform pg_temp.save_reception_collaborator_draft('test',payload,0,false,b);
 if (select vendor_notes from pg_temp.reception_floor_plans)<>'original' then raise exception 'Draft changed live plan';end if;
 blocked=false;begin perform pg_temp.save_reception_collaborator_draft('test',payload,0,false,b);exception when others then blocked=true;end;if not blocked then raise exception 'Stale revision allowed';end if;
 perform pg_temp.save_reception_collaborator_draft('test',payload,1,true,b);
 blocked=false;begin perform pg_temp.save_reception_collaborator_draft('test',payload,2,false,b);exception when others then blocked=true;end;if not blocked then raise exception 'Submitted edit allowed';end if;
 perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
 blocked=false;begin perform pg_temp.review_reception_collaborator_draft(lid,2,true);exception when others then blocked=true;end;if not blocked then raise exception 'Non-owner approval allowed';end if;
 perform set_config('request.jwt.claim.sub',uid::text,true);
 perform pg_temp.review_reception_collaborator_draft(lid,2,true);
 if (select vendor_notes from pg_temp.reception_floor_plans)<>'proposed' or (select background_image_url from pg_temp.reception_floor_plans)<>'private-path' or (select room_width_m from pg_temp.reception_floor_plans)<>20 then raise exception 'Approval changed wrong fields';end if;
 select updated_at into b from pg_temp.reception_floor_plans;
 perform pg_temp.save_reception_collaborator_draft('test',payload,2,true,b);
 update pg_temp.reception_floor_plans set updated_at=updated_at+interval '1 minute';
 blocked=false;begin perform pg_temp.review_reception_collaborator_draft(lid,3,true);exception when others then blocked=true;end;if not blocked then raise exception 'Approval overwrote newer owner changes';end if;
 perform pg_temp.review_reception_collaborator_draft(lid,3,false);
 if (select status from pg_temp.reception_collaborator_drafts)<>'rejected' then raise exception 'Rejection failed';end if;
 update pg_temp.floor_plan_share_tokens set expires_at=now()-interval '1 hour';
 blocked=false;begin perform pg_temp.save_reception_collaborator_draft('test',payload,3,false,b);exception when others then blocked=true;end;if not blocked then raise exception 'Expired save allowed';end if;
 delete from pg_temp.floor_plan_share_tokens;
 blocked=false;begin perform pg_temp.save_reception_collaborator_draft('test',payload,3,false,b);exception when others then blocked=true;end;if not blocked then raise exception 'Revoked save allowed';end if;
end $test$;
rollback;
select 'Isolated temporary-table RPC checks passed; no live records changed' as result;
