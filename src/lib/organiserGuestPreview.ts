import {supabase} from '@/integrations/supabase/client';
import {normalizeRsvp} from '@/lib/rsvp';
export type PreviewMode = 'invitation'|'seating';
export type GuestPreviewSnapshot = {actorId?:string;event:any;guests:any[];tables:any[];visibility:any;modules:any;songs:any;ceremony:any;reception:any;receptionBackground:string|null;wishesEnabled?:boolean};
/** Only authenticated, server-authorised, RLS-scoped reads. Never creates defaults or caches customer records. */
export async function loadOrganiserGuestPreview(eventId:string,client:any=supabase):Promise<GuestPreviewSnapshot>{
 const {data:{user},error:authError}=await client.auth.getUser();
 if(authError||!user)throw Error('Sign in to preview your event.');
 const permission=await client.rpc('can_access_event',{_user_id:user.id,_event_id:eventId});
 if(permission.error||permission.data!==true)throw Error('You do not have organiser access to this event.');
 const eventResult=await client.from('events').select('*').eq('id',eventId).single();
 if(eventResult.error||!eventResult.data)throw Error('This event is unavailable to your account.');
 const event=eventResult.data;
 const read=async(table:string,single=false)=>{const q=client.from(table).select('*').eq('event_id',eventId);const r=await(single?q.maybeSingle():q);if(r.error)throw r.error;return r.data;};
 const guests:any[]=[];
 for(let start=0;;start+=1000){const r=await client.from('guests').select('*').eq('event_id',eventId).order('id').range(start,start+999);if(r.error)throw r.error;guests.push(...r.data);if(r.data.length<1000)break;}
 const [tables,visibility,modules,songs,ceremony,reception]=await Promise.all([read('tables'),read('live_view_settings',true),read('live_view_module_settings',true),read('guest_song_request_settings',true),read('ceremony_floor_plans',true),read('reception_floor_plans',true)]);
 if(guests.some(g=>g.event_id!==eventId||g.user_id!==event.user_id)||tables.some(t=>t.event_id!==eventId||t.user_id!==event.user_id))throw Error('Event preview scope could not be verified.');
 const wishes=await client.rpc('video_wishes_available',{_event_id:eventId});if(wishes.error)throw wishes.error;
 const current=await client.auth.getUser();if(current.error||current.data.user?.id!==user.id)throw Error('Your session changed. Reopen the preview.');
 let receptionBackground:string|null=null;
 if(reception?.background_image_url){const r=await client.storage.from('reception-floor-plan-backgrounds').createSignedUrl(reception.background_image_url,300);if(r.error)throw r.error;receptionBackground=r.data.signedUrl;}
 return {actorId:user.id,event,guests,tables,visibility:visibility||{},modules:modules||{},songs:songs||{},ceremony,reception,receptionBackground,wishesEnabled:wishes.data===true};
}
/** A closed, in-memory read adapter. Unknown RPCs, table operations and Edge Functions fail closed. */
export function createGuestPreviewClient(snapshot:GuestPreviewSnapshot){
 const {event,guests,tables,visibility,modules}=snapshot;
 const result=(data:any,error:any=null)=>{const p:any=Promise.resolve({data:structuredClone(data),error});p.abortSignal=()=>p;return p;};
 const deny=()=>result(null,new Error('Organiser preview is read-only. No request was sent.'));
 const guestRows=()=> (guests.length?guests:[null]).map(g=>({
  event_id:event.id,event_name:event.name,event_date:event.date,event_venue:event.venue,event_start_time:event.start_time,event_finish_time:event.finish_time,event_timezone:event.event_timezone,partner1_name:event.partner1_name,partner2_name:event.partner2_name,ceremony_venue:event.ceremony_venue,ceremony_start_time:event.ceremony_start_time,ceremony_finish_time:event.ceremony_finish_time,event_allow_guest_plus_ones:event.allow_guest_plus_ones,event_collect_guest_addresses:event.collect_guest_addresses,
  ...visibility,...modules,guest_id:g?.id,guest_first_name:g?.first_name,guest_last_name:g?.last_name||'',guest_table_id:g?.table_id,guest_table_no:g?.table_no,guest_seat_no:g?.seat_no,guest_rsvp:normalizeRsvp(g?.rsvp),guest_dietary:g?.dietary,guest_family_group:g?.family_group,guest_added_by_guest_id:g?.added_by_guest_id,guest_allow_plus_one:g?.allow_plus_one
 }));
 const rpc=(name:string,args:any={})=>{
  const id=args._event_id||args.p_event_id;if(id&&id!==event.id)return deny();
  if(name==='qr_guest_public_event')return args.event_slug===event.slug?result(guestRows()):deny();
  if(name==='get_public_table_data'||name==='get_public_table_semantics'){
   const table=tables.find(t=>t.id===args.p_table_id);if(!table)return result(name==='get_public_table_data'?[]:{});
   if(name==='get_public_table_semantics')return result({...table,participant1_name:event.partner1_name,participant2_name:event.partner2_name});
   const members=guests.filter(g=>g.table_id===table.id);
   return result((members.length?members:[null]).map(g=>({table_id:table.id,table_no:table.table_no,table_name:table.name,limit_seats:table.limit_seats,table_notes:table.notes,guest_id:g?.id,guest_first_name:g?.first_name,guest_last_name:g?.last_name||'',guest_seat_no:g?.seat_no,guest_dietary:g?.dietary,guest_rsvp:normalizeRsvp(g?.rsvp)})));
  }
  if(name==='get_guest_song_request_settings_public')return result([snapshot.songs]);
  if(name==='video_wishes_available')return result(snapshot.wishesEnabled===true);
  if(name==='get_public_ceremony_floor_plan')return args.event_slug===event.slug?result(snapshot.ceremony?[snapshot.ceremony]:[]):deny();
  if(['qr_guest_details','get_guest_details_form','get_guest_details_form_authorized'].includes(name)){
   const guest=guests.find(g=>g.id===args._guest_id);if(!guest)return deny();
   return result({guest,can_edit:true,can_rsvp:true,is_manager:false,allow_name_edit:modules.update_details_config?.allow_name_edit??false,allow_plus_one:event.allow_guest_plus_ones,collect_guest_addresses:event.collect_guest_addresses});
  }
  return deny();
 };
 return {rpc,from:()=>{throw Error('Organiser preview cannot access or change database tables.');},functions:{invoke:deny}};
}
