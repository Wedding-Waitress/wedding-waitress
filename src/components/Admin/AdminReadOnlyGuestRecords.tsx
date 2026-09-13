import {useState} from 'react';
import {Table,TableHeader,TableHead,TableRow,TableCell,TableBody} from '@/components/ui/table';
import {Badge} from '@/components/ui/badge';
import {getRsvpDisplayLabel,getRsvpBadgeVariant} from '@/lib/rsvp';
import styles from '@/components/Dashboard/GuestListTable.module.css';
const fields=['first_name','last_name','mobile','email','notes','rsvp','dietary','relation_display','family_group','added_by_guest_id','rsvp_invite_status'];
function validRows(value:unknown,ownerId:string,eventId:string):value is Record<string,any>[] {
 return Array.isArray(value)&&new Set(value.map(row=>row?.id)).size===value.length&&value.every(row=>row&&typeof row==='object'&&row.user_id===ownerId&&row.event_id===eventId&&typeof row.id==='string'
  &&typeof row.first_name==='string'&&typeof row.last_name==='string'
  &&fields.every(key=>key in row&&(row[key]===null||typeof row[key]==='string'))
  &&['table_no','seat_no'].every(key=>row[key]===null||Number.isSafeInteger(row[key]))
  &&(row.allow_plus_one===null||typeof row.allow_plus_one==='boolean'));
}
export function AdminReadOnlyGuestRecords({ownerId,eventId,guests}:{ownerId:string;eventId:string;guests:unknown}){
 const [search,setSearch]=useState(''),[page,setPage]=useState(0);
 if(!validRows(guests,ownerId,eventId))return <p>Complete owned guest records are unavailable. No customer records have been substituted.</p>;
 const term=search.trim().toLocaleLowerCase(),filtered=guests.filter(row=>fields.some(key=>typeof row[key]==='string'&&row[key].toLocaleLowerCase().includes(term)));
 const pageCount=Math.ceil(filtered.length/50),current=Math.min(page,Math.max(0,pageCount-1)),visible=filtered.slice(current*50,(current+1)*50);
 const shown=(value:unknown)=>value===null||value===''?'Not recorded':String(value);
 const addresses=guests.every(row=>typeof row.address_received==='boolean'&&['mailing_address','mailing_suburb','mailing_state','mailing_postcode'].every(key=>key in row&&(row[key]===null||typeof row[key]==='string')));
 return <section className={styles.page} aria-label="Read-only saved guest records"><label>Search saved guests<input className="ml-2 border rounded-lg px-3 py-2" value={search} onChange={event=>{setSearch(event.target.value);setPage(0);}}/></label><p>{filtered.length} matching saved guests. Read-only.</p>
  <div className="overflow-x-auto mt-4"><Table className="min-w-[1100px] border-collapse"><TableHeader data-tone="inverse"><TableRow>
   {['First Name','Last Name','Mobile','Email','+ Guest','RSVP Invite','RSVP Status','Table No','Seat No','Relation','Dietary Requirements','Recorded Group','Added By','Notes',...(addresses?['Address Received','Mailing Address','Suburb','State','Postcode']:[])].map(heading=><TableHead key={heading} className="px-2 py-2 text-xs text-center align-middle">{heading}</TableHead>)}
  </TableRow></TableHeader><TableBody>{visible.map(row=>{const addedBy=guests.find(candidate=>candidate.id===row.added_by_guest_id);return <TableRow key={row.id} className="border-card-border hover:bg-[#F5F0EB]">
   <TableCell>{row.first_name}</TableCell><TableCell>{row.last_name}</TableCell><TableCell>{shown(row.mobile)}</TableCell><TableCell className="break-all">{shown(row.email)}</TableCell>
   <TableCell>{row.allow_plus_one===null?'Not recorded':row.allow_plus_one?'Yes':'No'}</TableCell><TableCell>{shown(row.rsvp_invite_status)}</TableCell>
   <TableCell>{row.rsvp===null?<span>Not recorded</span>:<Badge variant={getRsvpBadgeVariant(row.rsvp)}>{getRsvpDisplayLabel(row.rsvp)}</Badge>}</TableCell>
   <TableCell>{shown(row.table_no)}</TableCell><TableCell>{shown(row.seat_no)}</TableCell><TableCell>{shown(row.relation_display)}</TableCell><TableCell>{shown(row.dietary)}</TableCell><TableCell>{shown(row.family_group)}</TableCell>
   <TableCell>{addedBy?`${addedBy.first_name} ${addedBy.last_name}`:'Not recorded in this event'}</TableCell><TableCell className="whitespace-pre-wrap break-words">{shown(row.notes)}</TableCell>
   {addresses&&<><TableCell>{row.address_received?'Yes':'No'}</TableCell>{['mailing_address','mailing_suburb','mailing_state','mailing_postcode'].map(key=><TableCell className="whitespace-pre-wrap break-words" key={key}>{shown(row[key])}</TableCell>)}</>}
  </TableRow>;})}</TableBody></Table></div>
  {filtered.length===0&&<p>No saved guests match this search.</p>}
  {pageCount>1&&<nav aria-label="Read-only guest pages"><button disabled={current===0} onClick={()=>setPage(current-1)}>Previous guest page</button><span className="mx-3">Page {current+1} of {pageCount}</span><button disabled={current===pageCount-1} onClick={()=>setPage(current+1)}>Next guest page</button></nav>}
  {!addresses&&<p>Complete saved mailing-address records are unavailable. No address or received status has been inferred.</p>}
  <p>Saved business records only. Sending, purchases, editing, group repair, deletion and private guest links remain unavailable.</p>
 </section>;
}
