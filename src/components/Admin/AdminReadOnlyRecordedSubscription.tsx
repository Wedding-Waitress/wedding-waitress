import {Gem} from 'lucide-react';
import {SectionCard} from '@/components/Account/SectionCard';
import {adminPlanLabel} from '@/lib/adminPlanDisplay';
/** Recorded database state, not inferred Stripe payment or effective entitlement. */
export function AdminReadOnlyRecordedSubscription({ownerId,subscription}:{ownerId:string;subscription:unknown}){
 const row=subscription as Record<string,unknown>|null;
 const date=(value:unknown)=>typeof value==='string'&&Number.isFinite(Date.parse(value));
 const valid=!!row&&row.user_id===ownerId&&typeof row.plan_name==='string'&&row.plan_name.length>0
  &&typeof row.status==='string'&&['active','expired','grace_period','cancelled'].includes(row.status)
  &&date(row.started_at)&&date(row.expires_at)&&(row.download_only_ends_at===null||date(row.download_only_ends_at))
  &&typeof row.is_read_only==='boolean'&&(row.guest_limit===null||Number.isInteger(row.guest_limit)&&Number(row.guest_limit)>=0)
  &&Number.isInteger(row.included_events)&&Number(row.included_events)>=0;
 const format=(value:unknown)=>new Date(value as string).toLocaleString('en-AU',{day:'numeric',month:'long',year:'numeric',hour:'numeric',minute:'2-digit'});
 return <SectionCard icon={Gem} title="Recorded Plan & Access Dates" description="Read-only subscription record">
  {subscription===null?<p>No subscription record exists. A free trial or paid plan has not been inferred.</p>:!valid?<p role="alert">Complete owned subscription information is unavailable.</p>:<dl className="text-sm">
   {[
    ['Recorded plan',adminPlanLabel(row.plan_name as string)],['Recorded status',row.status],['Access started',format(row.started_at)],
    ['Access expiry',format(row.expires_at)],['Download-only ends',row.download_only_ends_at?format(row.download_only_ends_at):'Not recorded'],
    ['Recorded read-only flag',row.is_read_only?'Yes':'No'],['Plan guest capacity',row.guest_limit===null?'No recorded limit':String(row.guest_limit)],
    ['Plan included events',String(row.included_events)],
   ].map(([label,value])=><div key={label as string} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-2 border-b border-border/50 last:border-0"><dt className="text-muted-foreground font-medium">{label as string}</dt><dd className="text-foreground font-medium">{value as string}</dd></div>)}
  </dl>}
  <p className="text-sm mt-4">Recorded dates and status are not proof of payment or a fresh entitlement decision. Stripe payment methods, invoices, portal links, purchases and renewal actions are not requested or exposed here.</p>
 </SectionCard>;
}
