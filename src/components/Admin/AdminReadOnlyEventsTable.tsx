import {EventsTable} from '@/components/Dashboard/EventsTable';
type Row=Record<string,any>;
function rows(ownerId:string,events:unknown[]){
 const result:Row[]=[],ids=new Set<string>();
 for(const value of events){if(!value||typeof value!=='object')return null;const event=value as Row,saved=event.saved_event;
  if(typeof event.id!=='string'||ids.has(event.id)||!saved||saved.id!==event.id||saved.user_id!==ownerId||typeof saved.name!=='string'||!Array.isArray(event.guests))return null;ids.add(event.id);
  const guestIds=new Set<string>();if(!event.guests.every((guest:any)=>{if(!guest||typeof guest.id!=='string'||guestIds.has(guest.id)||guest.user_id!==ownerId||guest.event_id!==event.id)return false;guestIds.add(guest.id);return true;}))return null;
  if(!['date','venue','start_time','finish_time','event_created','expiry_date','created_date_local','expiry_date_local','event_timezone','partner1_name','partner2_name','rsvp_deadline','event_id'].every(key=>key in saved&&(saved[key]===null||typeof saved[key]==='string')))return null;
  if(typeof saved.created_at!=='string'||!/^\d{4}-\d{2}-\d{2}T/.test(saved.created_at)||!Number.isFinite(Date.parse(saved.created_at))||!Number.isSafeInteger(saved.guest_limit)||saved.guest_limit<0)return null;
  if(!['date','event_created','expiry_date','created_date_local','expiry_date_local'].every(key=>saved[key]===null||/^\d{4}-\d{2}-\d{2}$/.test(saved[key])&&Number.isFinite(Date.parse(saved[key]))&&new Date(saved[key]).toISOString().slice(0,10)===saved[key]))return null;
  if(!['start_time','finish_time'].every(key=>saved[key]===null||/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d+)?)?$/.test(saved[key])))return null;
  if(saved.rsvp_deadline!==null&&(!/^\d{4}-\d{2}-\d{2}(?:T|$)/.test(saved.rsvp_deadline)||!Number.isFinite(Date.parse(saved.rsvp_deadline))))return null;
  if(saved.event_timezone!==null)try{new Intl.DateTimeFormat('en',{timeZone:saved.event_timezone});}catch{return null;}
  result.push({...saved,guests_count:event.guests.length});
 }return result;
}
const forbidden=async()=>{throw Error('Customer event mutations are unavailable in a read-only preview');};
export function AdminReadOnlyEventsTable({ownerId,customer,events}:{ownerId:string;customer:unknown;events:unknown[]}){
 const data=rows(ownerId,events),profile=customer&&typeof customer==='object'?customer as Row:null;
 const selected=profile?.user_id===ownerId&&typeof profile.display_countdown_event_id==='string'&&data?.some(event=>event.id===profile.display_countdown_event_id)?profile.display_countdown_event_id:null;
 if(!data)return <p role="status">Complete saved owned event-table records are unavailable. Dates, allowance and event ownership have not been manufactured.</p>;
 return <section aria-label="Read-only customer My Events table"><EventsTable readOnly events={data as any} loading={false} activeEventId={selected} setActiveEventId={forbidden} createEvent={forbidden} updateEvent={forbidden} deleteEvent={forbidden} selectedEvent={data.find(event=>event.id===selected) as any}/>
  <p className="text-sm mt-3">Existing customer event-table formatting is preserved. Event-row expiry is its saved value or existing display calculation, not verified paid subscription entitlement. Creation, purchase, editing, deletion and countdown selection are disabled.</p>
 </section>;
}
