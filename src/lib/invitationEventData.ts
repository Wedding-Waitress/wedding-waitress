import {formatDisplayDate,formatDisplayTime} from '@/lib/utils';
export type InvitationEventDataSource={name:string;date?:string|null;partner1_name?:string|null;partner2_name?:string|null;venue?:string|null;start_time?:string|null;finish_time?:string|null;rsvp_deadline?:string|null;ceremony_enabled?:boolean|null;ceremony_venue?:string|null;ceremony_venue_address?:string|null;ceremony_start_time?:string|null;ceremony_finish_time?:string|null;reception_enabled?:boolean|null;venue_address?:string|null};
/** Identical saved-event substitutions for organizer and read-only support views. */
export function invitationEventDataFromEvent(event:InvitationEventDataSource|null|undefined):Record<string,string>{
 if(!event)return {};
 const p1=event.partner1_name||'',p2=event.partner2_name||'';
 return {couple_names:p1&&p2?`${p1} & ${p2}`:p1||p2||event.name,event_name:event.name||'',
  date:event.date?formatDisplayDate(event.date):'',date_raw:event.date||'',venue:event.venue||'',
  time:event.start_time?formatDisplayTime(event.start_time):'',finish_time:event.finish_time?formatDisplayTime(event.finish_time):'',
  rsvp_deadline:event.rsvp_deadline?formatDisplayDate(event.rsvp_deadline):'',rsvp_deadline_raw:event.rsvp_deadline||'',
  ceremony_enabled:event.ceremony_enabled?'true':'false',ceremony_venue:event.ceremony_venue||'',ceremony_venue_address:event.ceremony_venue_address||'',
  ceremony_time:event.ceremony_start_time?formatDisplayTime(event.ceremony_start_time):'',ceremony_finish_time:event.ceremony_finish_time?formatDisplayTime(event.ceremony_finish_time):'',
  reception_enabled:event.reception_enabled?'true':'false',venue_address:event.venue_address||''};
}
