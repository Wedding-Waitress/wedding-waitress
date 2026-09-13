import { UserRound } from 'lucide-react';
import { SectionCard } from '@/components/Account/SectionCard';
import { AccountInfoDetails } from '@/components/Account/AccountInfoDetails';
import {AdminReadOnlyProfileArtwork} from './AdminReadOnlyProfileArtwork';

type Details={user_id:string;account_id:string|null;name:string;email:string;mobile:string|null;login_email:string|null;
  pending_email:string|null;email_confirmed_at:string|null;member_since:string|null;account_role:'master'|'standard'|null;
  marketing_preference:{status:'opted_in'|'opted_out';consent_email:string}|null};
function isDetails(value:unknown,ownerId:string):value is Details {
  if(!value||typeof value!=='object')return false;
  const row=value as Record<string,unknown>;
  const nullable=(key:string)=>row[key]===null||typeof row[key]==='string';
  const timestamp=(key:string)=>row[key]===null||typeof row[key]==='string'&&Number.isFinite(Date.parse(row[key] as string));
  const preference=row.marketing_preference as Details['marketing_preference'];
  return row.user_id===ownerId&&typeof row.name==='string'&&typeof row.email==='string'
    &&['account_id','mobile','login_email','pending_email'].every(nullable)
    &&['email_confirmed_at','member_since'].every(timestamp)
    &&[null,'master','standard'].includes(row.account_role as any)
    &&(preference===null||!!preference&&['opted_in','opted_out'].includes(preference.status)&&typeof preference.consent_email==='string');
}
export function AdminReadOnlyAccountDetails({ownerId,customer}:{ownerId:string;customer:unknown}) {
  if(!isDetails(customer,ownerId))return <p>Saved account details are unavailable. No customer authentication or settings were changed.</p>;
  const preference=customer.marketing_preference;
  const currentConsent=preference?.status==='opted_in'&&!!customer.login_email
    &&preference.consent_email===customer.login_email.toLowerCase();
  return <SectionCard icon={UserRound} title="Account Info" description="Your personal details">
    <AdminReadOnlyProfileArtwork ownerId={ownerId} email={customer.login_email||customer.email} artwork={(customer as any).profile_artwork}/>
    <AccountInfoDetails accountId={customer.account_id||'—'} fullName={customer.name||'—'}
      email={customer.login_email||customer.email||'—'} pendingEmail={customer.pending_email} mobile={customer.mobile||'—'}
      role={customer.account_role==='master'?'Account Holder':customer.account_role==='standard'?'Team Member':'Unavailable'}
      verification={customer.member_since?(customer.email_confirmed_at?'Verified':'Not verified'):'Unavailable'} createdAt={customer.member_since}/>
    <section className="mt-6 border-t border-border/50 pt-4" aria-label="Read-only marketing preference">
      <h3 className="text-sm font-semibold">Marketing email preferences</h3>
      <p className="text-sm mt-1">Optional news and offers. This does not change sign-in, account or event notifications.</p>
      <label className="flex items-start gap-2 text-sm mt-3"><input type="checkbox" checked={currentConsent} disabled readOnly/>
        I agree to receive Wedding Waitress news and promotional offers by email. I can unsubscribe at any time.</label>
      <p className="text-sm mt-2">{!preference?'No marketing consent record.':currentConsent?'Recorded opt-in for the current login email.':preference.status==='opted_out'?'Recorded opt-out.':'Earlier opt-in does not establish consent for the current login email.'}</p>
    </section>
    <p className="text-sm mt-4">Read-only account details. Editing and security controls are not available in this preview.</p>
  </SectionCard>;
}
