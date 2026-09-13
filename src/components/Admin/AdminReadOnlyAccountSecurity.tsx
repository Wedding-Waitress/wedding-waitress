import {ShieldCheck,CheckCircle2,AlertCircle} from 'lucide-react';
import {SectionCard} from '@/components/Account/SectionCard';
import {Badge} from '@/components/ui/badge';
/** Business verification status only. Never mounts customer Auth or password controls. */
export function AdminReadOnlyAccountSecurity({ownerId,customer}:{ownerId:string;customer:unknown}){
 const row=customer as Record<string,unknown>|null;
 const date=(value:unknown)=>value===null||typeof value==='string'&&Number.isFinite(Date.parse(value));
 if(!row||row.user_id!==ownerId||!(row.login_email===null||typeof row.login_email==='string')
  ||!date(row.email_confirmed_at)||!date(row.member_since))return <p>Saved account security status is unavailable.</p>;
 const known=typeof row.member_since==='string',verified=known&&typeof row.email_confirmed_at==='string';
 return <SectionCard icon={ShieldCheck} title="Security & Password" description="Password and email verification">
  <div className="space-y-3 text-sm">
   <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-2 border-b border-border/50">
    <span className="text-muted-foreground font-medium">Password</span><span>Private — not available to administrators</span>
   </div>
   <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-2">
    <span className="text-muted-foreground font-medium">Email</span>
    {!known?<span>Unavailable</span>:verified?<Badge className="rounded-[4px] bg-green-100 text-green-700 hover:bg-green-100 border-green-200 gap-1"><CheckCircle2 className="w-3 h-3"/>Verified</Badge>
     :<Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200 gap-1"><AlertCircle className="w-3 h-3"/>Not Verified</Badge>}
   </div>
  </div><p className="mt-4 text-sm">Read-only recorded verification status. Password changes, verification emails, sessions and account closure are unavailable here.</p>
 </SectionCard>;
}
