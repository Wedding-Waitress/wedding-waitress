import { useState } from 'react';
import { LifeBuoy } from 'lucide-react';
import { SectionCard } from '@/components/Account/SectionCard';
type Ticket={id:string;customer_id:string;event_id:string|null;full_name:string;contact_email:string;category:string;
  message:string;source:string;status:string;created_at:string;updated_at:string};
function isHistory(value:unknown,ownerId:string):value is Ticket[] {
  return Array.isArray(value)&&value.every(row=>row&&typeof row==='object'&&row.customer_id===ownerId
    &&['id','full_name','contact_email','category','message'].every(key=>typeof row[key]==='string')
    &&(row.event_id===null||typeof row.event_id==='string')
    &&['public_contact','get_help','account_support'].includes(row.source)
    &&['open','in_progress','resolved','closed'].includes(row.status)
    &&['created_at','updated_at'].every(key=>typeof row[key]==='string'&&Number.isFinite(Date.parse(row[key]))));
}
export function AdminReadOnlySupportHistory({ownerId,tickets}:{ownerId:string;tickets:unknown}) {
  const [page,setPage]=useState(0);
  if(!isHistory(tickets,ownerId))return <p>Saved support history is unavailable. No enquiries were sent or updated.</p>;
  const pages=Math.max(1,Math.ceil(tickets.length/30));const current=Math.min(page,pages-1);
  const date=(value:string)=>new Date(value).toLocaleString('en-AU');
  return <SectionCard icon={LifeBuoy} title="Support history" description="Recorded enquiries linked to this customer account">
    <p className="text-sm">Read-only. Older or anonymous enquiries without a saved customer link cannot be attributed to this account. A recorded ticket is not proof of email delivery.</p>
    {tickets.length===0?<p>No linked support enquiries recorded.</p>:tickets.slice(current*30,(current+1)*30).map(ticket=><article key={ticket.id} className="my-3 rounded-xl border border-border p-3">
      <h3>{ticket.category} — {ticket.status.replace(/_/g,' ')}</h3>
      <dl><dt>Submitted by</dt><dd>{ticket.full_name} · {ticket.contact_email}</dd>
        <dt>Created</dt><dd>{date(ticket.created_at)}</dd><dt>Updated</dt><dd>{date(ticket.updated_at)}</dd>
        <dt>Event</dt><dd>{ticket.event_id||'No event linked'}</dd></dl>
      <p className="whitespace-pre-wrap break-words">{ticket.message}</p>
    </article>)}
    {pages>1&&<nav aria-label="Support history pages"><button disabled={current===0} onClick={()=>setPage(current-1)}>Previous</button>
      <span>Page {current+1} of {pages}</span><button disabled={current===pages-1} onClick={()=>setPage(current+1)}>Next</button></nav>}
  </SectionCard>;
}
