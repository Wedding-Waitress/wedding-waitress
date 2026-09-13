import {CalendarDays,HeartHandshake,UserPlus,MapPin,Users,Mail,MessageSquare} from 'lucide-react';
import {Switch} from '@/components/ui/switch';
import {getGuestTypeStats} from '@/lib/guestGroupClassification';
import styles from '@/components/Dashboard/GuestListTable.module.css';
const nullableText=(value:unknown)=>value===null||typeof value==='string';
const recordedDate=(value:unknown)=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T/.test(value)&&Number.isFinite(Date.parse(value));
const text=(value:unknown)=>value===null||value===''?'Not recorded':String(value);
export function AdminReadOnlyGuestSetup({ownerId,eventId,savedEvent,guests,preferences,notifications}:{ownerId:string;eventId:string;savedEvent:unknown;guests:unknown;preferences:unknown;notifications:unknown}){
 const event=savedEvent as Record<string,any>|null;
 const validEvent=event&&event.id===eventId&&event.user_id===ownerId&&typeof event.name==='string'
  &&['two','single','off',null].includes(event.relation_mode)
  &&['partner1_name','partner2_name'].every(key=>key in event&&nullableText(event[key]))
  &&['allow_guest_plus_ones','collect_guest_addresses'].every(key=>typeof event[key]==='boolean');
 const rows=guests as Record<string,any>[];
 const validGuests=Array.isArray(rows)&&new Set(rows.map(row=>row?.id)).size===rows.length&&rows.every(row=>row&&row.user_id===ownerId&&row.event_id===eventId&&typeof row.id==='string'&&typeof row.first_name==='string'&&typeof row.last_name==='string'&&nullableText(row.family_group));
 if(!validEvent||!validGuests)return <p>Complete owned guest setup and group records are unavailable. No local browser preferences have been inferred.</p>;
 const stats=getGuestTypeStats(rows);
 const preference=preferences as Record<string,any>|null;
 const validPreference=preference&&preference.event_id===eventId&&preference.user_id===ownerId&&typeof preference.email_enabled==='boolean'&&typeof preference.sms_enabled==='boolean';
 const history=notifications as Record<string,any>[];
 const validHistory=Array.isArray(history)&&new Set(history.map(row=>row?.id)).size===history.length&&history.every(row=>row&&typeof row.id==='string'&&row.event_id===eventId&&row.user_id===ownerId&&rows.some(guest=>guest.id===row.guest_id)&&['separate','group'].includes(row.group_choice)&&['added_guest_name','added_by_name'].every(key=>typeof row[key]==='string')&&recordedDate(row.created_at)&&(row.reviewed_at===null||recordedDate(row.reviewed_at))&&['pending','processing','queued','sent','failed','disabled','not_requested'].includes(row.email_status)&&['pending','processing','queued','failed','disabled','not_requested'].includes(row.sms_status));
 const tile=(heading:string,icon:React.ReactNode,body:React.ReactNode)=><article className="rounded-xl border border-primary p-5 min-w-0 shadow-sm"><h3 className="text-lg font-bold flex gap-2 items-center">{icon}{heading}</h3>{body}</article>;
 return <section className={styles.page} aria-label="Read-only saved guest setup">
  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
   {tile('Step 1: Set Up Your Event',<CalendarDays size={20}/>,<><p>{event.name}</p><p>Recorded relationship mode: {event.relation_mode??'Not recorded'}</p><p>Event-type option is not inferred when relationships are disabled.</p></>)}
   {tile('Step 2: Guest Relationship Settings',<HeartHandshake size={20}/>,<>{event.relation_mode===null?<p>Relationship enablement is not recorded.</p>:<Switch aria-label="Saved Enable Relationships" checked={event.relation_mode!=='off'} disabled/>}<p>Partner 1: {text(event.partner1_name)}</p><p>Partner 2: {text(event.partner2_name)}</p><p>Browser-only label selection is not inferred.</p></>)}
   {tile('Step 3: Allow Guests To Add +1s',<UserPlus size={20}/>,<Switch aria-label="Saved Allow Guests To Add +1s" checked={event.allow_guest_plus_ones} disabled/>)}
   {tile('Step 4: Collect Guest Mailing Addresses',<MapPin size={20}/>,<Switch aria-label="Saved Collect Guest Mailing Addresses" checked={event.collect_guest_addresses} disabled/>)}
   {tile('Step 5: Add Guests',<Users size={20}/>,<><p>{rows.length} saved guests</p><button disabled>Add Guest</button></>)}
  </div>
  <p>{stats.individual} Individual · {stats.couple} Couple · {stats.family} Family — classified using the same saved-group rules as the guest list. No groups are repaired or changed.</p>
  <section className="rounded-xl border border-primary p-4 my-4" aria-label="Read-only new guest alerts"><h3>New guests added by invited guests</h3>
   {validPreference?<div className="grid md:grid-cols-2 gap-3"><label className="flex items-center gap-2"><Mail size={18}/>Email <Switch aria-label="Saved new guest email alerts" checked={preference.email_enabled} disabled/></label><label className="flex items-center gap-2"><MessageSquare size={18}/>SMS <Switch aria-label="Saved new guest SMS alerts" checked={preference.sms_enabled} disabled/></label></div>:<p>Notification preferences not recorded. No default preference or verification status is substituted.</p>}
   {validHistory?<><p>Awaiting review: {history.filter(row=>row.reviewed_at===null).length}</p><div className="overflow-x-auto"><table className="w-full"><thead><tr>{['New +1 Guest Added','Added by','Added Date & Time','Recorded review','Email status','SMS status'].map(label=><th className="p-2 text-left" key={label}>{label}</th>)}</tr></thead><tbody>{history.map(row=><tr key={row.id}><td className="p-2">{row.added_guest_name}</td><td className="p-2">{row.added_by_name}</td><td className="p-2">{row.created_at}</td><td className="p-2">{row.reviewed_at??'Awaiting review'}</td><td className="p-2">{row.email_status}</td><td className="p-2">{row.sms_status}</td></tr>)}</tbody></table></div>{history.length===0&&<p>No saved guest-addition notifications.</p>}</>:<p>Complete owned notification history is unavailable.</p>}
  </section><p>Read-only. No RSVP, email, SMS, review, guest repair, purchase, private link or customer notification action is enabled.</p>
 </section>;
}
