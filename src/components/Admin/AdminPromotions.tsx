import './AdminPromotions.css';
import { promotionExpiryLabel, promotionSydneyDate, validatePromotionExpiry } from '../../../supabase/functions/_shared/promotionExpiryRules';
import React, { useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogContent, AlertDialogTitle, AlertDialogDescription } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { normalizePromotionCode, promotionPreview, validatePromotionPercent } from '../../../supabase/functions/_shared/promotionRules';
import { promotionAccountSearchEmail, validatePromotionAudience, type PromotionAudience } from '../../../supabase/functions/_shared/promotionAudienceRules';

type Account = { id: string; account_id: string; name: string; email: string };
type Campaign = {
  expiry_date?: string | null; expires_at?: string | null; expiry_version?: number;
  id: string; code: string; campaign_name: string; percent_off: number; active: boolean;
  audience?: PromotionAudience; audience_version?: number; usage_limit?: number | null;
  bound_account_id?: string; bound_account_name?: string; bound_account_email?: string;
  used?: number; reserved?: number; remaining?: number | null;
};
const audienceLabels: Record<PromotionAudience, string> = { general: 'General', customer: 'Specific customer', venue_partner: 'Venue / Partner' };
const selectClass = 'mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm';

export function AdminPromotions() {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [percent, setPercent] = useState('50');
  const [audience, setAudience] = useState<PromotionAudience>('general');
  const [usageLimit, setUsageLimit] = useState(1);
  const [expiryMode, setExpiryMode] = useState('none');
  const [expiryDate, setExpiryDate] = useState('');
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [allocation, setAllocation] = useState<{ id: string; value: string; error: string } | null>(null);
  const [email, setEmail] = useState('');
  const [matches, setMatches] = useState<Account[]>([]);
  const [searched, setSearched] = useState(false);
  const [account, setAccount] = useState<Account | null>(null);
  const searchSequence = useRef(0);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [deleting, setDeleting] = useState<Campaign | null>(null);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const discount = Number(percent);
  const valid = Number.isInteger(discount) && discount >= 1 && discount <= 100;
  const request = async (body: Record<string, unknown>) => {
    const result = await supabase.functions.invoke('admin-promotions', { body: { ...body,
      admin_grant: sessionStorage.getItem('ww_admin_grant'), admin_grant_signature: sessionStorage.getItem('ww_admin_grant_sig') } });
    let envelope = result.data;
    const context = (result.error as unknown as { context?: Response } | null)?.context;
    if (result.error && !envelope?.error && context && typeof context.clone === 'function') {
      try { envelope = await context.clone().json(); } catch { /* Preserve the fail-closed message. */ }
    }
    if (result.error || envelope?.success !== true) {
      const failure = new Error(envelope?.error || 'Promotion management is unavailable.') as Error & { campaign?: Campaign };
      if (envelope?.campaign) failure.campaign = envelope.campaign;
      throw failure;
    }
    return envelope.data;
  };
  const resetAccount = () => { searchSequence.current++; setAccount(null); setMatches([]); setSearched(false); };
  const findAccount = async () => {
    if (busy) return;
    const sequence = ++searchSequence.current;
    setBusy(true); setError(''); setAccount(null); setMatches([]); setSearched(false);
    try {
      const data = await request({ action: 'search_accounts', email: promotionAccountSearchEmail(email) });
      if (sequence !== searchSequence.current) return;
      if (!Array.isArray(data)) throw new Error('Account lookup could not be confirmed.');
      setMatches(data); setSearched(true);
    } catch (failure) { if (sequence === searchSequence.current) setError(failure instanceof Error ? failure.message : 'Account lookup is unavailable.'); }
    finally { setBusy(false); }
  };
  const perform = async (body: Record<string, unknown>) => {
    if (busy) return;
    setBusy(true); setPendingAction(String(body.action)); setError(''); setNotice('');
    try {
      if (body.action === 'create_expiring_campaign') {
        normalizePromotionCode(code); validatePromotionPercent(discount); validatePromotionAudience(body); validatePromotionExpiry(body.expiry_date);
      }
      const data = await request(body);
      if (body.action === 'list') {
        if (!Array.isArray(data)) throw new Error('Campaign list could not be confirmed.');
        setCampaigns(data);
      } else if (body.action === 'delete') {
        if (data?.id !== body.id || typeof data.deleted_at !== 'string' || data.active !== false) throw new Error('Campaign deletion could not be confirmed.');
        setCampaigns(previous => previous.filter(campaign => campaign.id !== data.id));
        setNotice(`Deleted campaign “${deleting?.campaign_name ?? data.campaign_name}”.`);
        setDeleting(null);
      } else {
        if (!data?.id || body.action === 'create_expiring_campaign' && data.audience_version !== 2) throw new Error('Audience-aware campaign creation is unavailable. No success is confirmed.');
        if (body.action === 'create_expiring_campaign' && (data.expiry_version !== 1 || data.expiry_date !== body.expiry_date || body.expiry_date !== null && typeof data.expires_at !== 'string')) throw new Error('Campaign expiry could not be confirmed. No success is confirmed.');
        setCampaigns(previous => [data, ...previous.filter(campaign => campaign.id !== data.id)]);
        if (body.action === 'create_expiring_campaign') { setCode(''); setName(''); setExpiryMode('none'); setExpiryDate(''); }
      }
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Promotion could not be confirmed.'); }
    finally { setBusy(false); setPendingAction(null); }
  };

  const allocationCampaign = campaigns.find(campaign => campaign.id === allocation?.id);
  const minimumAllocation = (allocationCampaign?.used ?? 0) + (allocationCampaign?.reserved ?? 0);
  const saveAllocation = async () => {
    if (busy || !allocation || !allocationCampaign) return;
    const value = Number(allocation.value);
    if (!allocation.value.trim() || !Number.isInteger(value) || value < 0 || value > 100) {
      setAllocation({ ...allocation, error: 'Choose a whole total allocation from 0 to 100.' }); return;
    }
    if (value < minimumAllocation) {
      setAllocation({ ...allocation, error: 'Minimum allocation is '+minimumAllocation+': '+allocationCampaign.used+' used and '+allocationCampaign.reserved+' reserved.' }); return;
    }
    setBusy(true); setError(''); setNotice('');
    try {
      const data = await request({ action: 'set_usage_limit', id: allocation.id, usage_limit: value });
      if (data?.id !== allocation.id || data.usage_limit !== value || !Number.isSafeInteger(data.used) || !Number.isSafeInteger(data.reserved)) throw new Error('Allocation save could not be confirmed.');
      setCampaigns(previous => previous.map(campaign => campaign.id === data.id ? data : campaign));
      setNotice('Allocation for “'+allocationCampaign.campaign_name+'” saved as '+value+'.'); setAllocation(null);
    } catch (failure) {
      const campaign = (failure as Error & { campaign?: Campaign }).campaign;
      if (campaign?.id === allocation.id && Number.isSafeInteger(campaign.used) && Number.isSafeInteger(campaign.reserved)) setCampaigns(previous => previous.map(row => row.id === campaign.id ? campaign : row));
      setAllocation(previous => previous ? { ...previous, error: failure instanceof Error ? failure.message : 'Allocation could not be saved.' } : null);
    } finally { setBusy(false); }
  };
  return <section className="ww-promotions-container mt-6 rounded-xl border border-[#dbc6a4] bg-[#fffdf8] p-5 text-[#2f1b14]" aria-labelledby="promotions-heading">
    <h2 id="promotions-heading" className="text-xl font-semibold">Promotions &amp; Codes</h2>
    <p className="my-2 text-sm" role="note">Customers can check promo codes when choosing their first package. Account verification, campaign availability and checkout eligibility are checked separately.</p>
    <form onSubmit={event => { event.preventDefault(); void perform({ action: 'create_expiring_campaign', code, campaign_name: name, percent_off: discount,
      audience, usage_limit: usageLimit, expiry_date: expiryMode === 'none' ? null : expiryDate, bound_account_id: audience === 'general' ? null : account?.id ?? null }); }} className="ww-promotion-form">
      <div className="ww-promotion-top-row">
      <label>Campaign name<Input value={name} onChange={event => setName(event.target.value)} required maxLength={120} disabled={busy} /></label>
      <label>Promo code<Input placeholder="Enter your chosen code" value={code} onChange={event => setCode(event.target.value)} required maxLength={64} disabled={busy} /></label>
      <label>Discount (%)<Input type="number" min="1" max="100" step="1" value={percent} onChange={event => setPercent(event.target.value)} required disabled={busy} aria-describedby="promotion-credit-reminder" /></label>
      <label>Audience<select className={selectClass} value={audience} disabled={busy} onChange={event => { setAudience(event.target.value as PromotionAudience); resetAccount(); }}>
        {Object.entries(audienceLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select></label>
      <label>Usage limit<select className={selectClass} value={usageLimit} disabled={busy} onChange={event => setUsageLimit(Number(event.target.value))} aria-describedby="promotion-usage-explanation">
        {Array.from({length: 101}, (_, limit) => <option key={limit} value={limit}>{limit}</option>)}
      </select></label>
      <div className="ww-promotion-expiry-control">
        <label htmlFor="campaign-expiry-mode">Expiry</label>
        <div className="ww-promotion-expiry-inputs">
          <select id="campaign-expiry-mode" className={selectClass} value={expiryMode} disabled={busy} aria-describedby="promotion-expiry-explanation" onChange={event => setExpiryMode(event.target.value)}>
            <option value="none">No expiry</option><option value="date">Choose date</option>
          </select>
          {expiryMode === 'date' && <Input aria-label="Expiry date" type="date" value={expiryDate} min={promotionSydneyDate()} required disabled={busy} onChange={event => setExpiryDate(event.target.value)} aria-describedby="promotion-expiry-explanation" />}
        </div>
      </div>
      <Button className="ww-promotion-create" type="submit" aria-busy={pendingAction === 'create_expiring_campaign'} disabled={busy || !valid || audience !== 'general' && !account}>{pendingAction === 'create_expiring_campaign' ? 'Creating…' : 'Create promo code'}</Button>
      </div>
      <p id="promotion-expiry-explanation" className="text-sm">Optional. A chosen date is valid through that day in Australia/Sydney. Already reserved checkouts may finish; expired codes cannot start new checkouts.</p>
      <div id="promotion-usage-explanation" className="md:col-span-3 lg:col-span-5 text-sm space-y-1">
        <p>{audience === 'general' ? 'General: a total allocation across eligible customer accounts.' : audience === 'customer'
          ? 'Specific customer: only the selected account may redeem this code.'
          : 'Venue / Partner: attribute one shareable code to an existing account. Couples redeem it from their own accounts; the total allocation is shared across those couples.'}</p>
        <p>0 allows no redemptions. Every redemption requires a verified account and its first package purchase; renewals are excluded. A higher allocation never permits repeat first purchases.</p>
        <p>In-progress checkouts reserve allocation. Pausing and reactivating never resets completed uses or reservations.</p>
      </div>
      {audience !== 'general' && <div className="md:col-span-3 lg:col-span-5 space-y-2 rounded-lg border border-[#dbc6a4] p-3">
        <label>{audience === 'customer' ? 'Customer account email' : 'Venue / Partner account email'}<Input type="email" value={email} disabled={busy} onChange={event => { setEmail(event.target.value); resetAccount(); }} /></label>
        <Button type="button" variant="outline" disabled={busy || !email.trim()} onClick={() => void findAccount()}>Find account</Button>
        {searched && !matches.length && <p role="status">No matching available account was found.</p>}
        {matches.map(match => <div key={match.id} className="flex flex-wrap items-center justify-between gap-2 rounded border border-[#dbc6a4] p-3">
          <span>{match.name || 'Unnamed account'} · {match.email} · Account {match.account_id || match.id}</span>
          <Button type="button" variant="outline" disabled={busy} aria-pressed={account?.id === match.id} onClick={() => setAccount(match)}>Select {match.name || match.email}</Button>
        </div>)}
        {account && <p role="status">Selected {audience === 'customer' ? 'customer' : 'Venue / Partner'}: {account.name || account.email} · {account.email} · Account {account.account_id || account.id}</p>}
      </div>}
      <aside id="promotion-credit-reminder" aria-label="Email and SMS credit reminder" className="md:col-span-3 lg:col-span-5 rounded-lg border border-[#dbc6a4] bg-[#f6efdf] p-3 text-sm leading-6">
        <p className="font-semibold">Email &amp; SMS credit reminder</p>
        <p><strong>1–50% off:</strong> Full package Email &amp; SMS credits are included.</p>
        <p><strong>51–100% off:</strong> Zero new Email &amp; SMS credits are included. Customers must purchase sending-credit top-ups. Existing purchased credits are not removed.</p>
      </aside>
      <div className="md:col-span-3 lg:col-span-5 text-sm">{valid ? `${discount}% off. ${discount <= 50 ? 'Normal package sending credits included.' : 'Zero new included email/SMS credits. Purchased top-ups remain available.'}` : 'Choose a whole percentage from 1 to 100.'}</div>
      {valid && <div className="ww-promotion-previews md:col-span-3 lg:col-span-5 grid gap-2 sm:grid-cols-3">{(['essential', 'premium', 'unlimited'] as const).map(plan => {
        const quote = promotionPreview(plan, discount);
        return <div key={plan} className="rounded-lg border border-[#dbc6a4] p-3"><strong>{plan === 'unlimited' ? 'Ultimate' : plan[0].toUpperCase() + plan.slice(1)}</strong><p>A${(quote.subtotalCents / 100).toFixed(2)} excluding GST</p><p>{quote.guestLimit} guests · {quote.includedCredits} shared email/SMS credits</p><p>12 months · all planning tools</p></div>;
      })}</div>}
      <div className="md:col-span-3 lg:col-span-5 flex flex-wrap gap-3"><Button type="button" variant="outline" className="ww-promotion-espresso" disabled={busy} onClick={() => void perform({ action: 'list' })}>Load campaigns</Button></div>
    </form>
    {notice && <p role="status" className="mt-3">{notice}</p>}
    {error && !deleting && <p role="alert" className="mt-3 text-red-700">{error}</p>}
    <ul className="ww-promotion-list mt-4 space-y-3">{campaigns.map(campaign => {
      const expired = !!campaign.expires_at && Number.isFinite(Date.parse(campaign.expires_at)) && Date.now() >= Date.parse(campaign.expires_at);
      const usageAvailable = campaign.audience_version === 2 && Number.isSafeInteger(campaign.used) && Number.isSafeInteger(campaign.reserved);
      const fields: [string, React.ReactNode][] = [
        ['Campaign name', campaign.campaign_name], ['Promo code', campaign.code],
        ['Discount', `${campaign.percent_off}%`], ['Status', <span className={expired ? 'ww-promotion-status-expired' : campaign.active ? 'ww-promotion-status-active' : 'ww-promotion-status-paused'}>{expired ? 'Expired' : campaign.active ? 'Active' : 'Paused'}</span>],
        ['Audience', <>{campaign.audience ? audienceLabels[campaign.audience] : 'Legacy campaign'}{campaign.bound_account_id && <span className="mt-1 block text-xs font-normal">{campaign.bound_account_name || campaign.bound_account_id}{campaign.bound_account_email && <> · {campaign.bound_account_email}</>}</span>}</>],
        ['Allocated', <>{usageAvailable ? campaign.usage_limit === null ? 'Uncapped (legacy)' : campaign.usage_limit ?? 'Unavailable' : 'Unavailable'}{usageAvailable && <button type="button" className="ww-promotion-allocation-edit" disabled={busy} aria-label={`Edit allocation for ${campaign.campaign_name}`} onClick={() => setAllocation({ id: campaign.id, value: campaign.usage_limit === null ? '' : String(campaign.usage_limit), error: '' })}>Edit</button>}</>],
        ['Used', usageAvailable ? campaign.used : 'Unavailable'], ['Reserved', usageAvailable ? campaign.reserved : 'Unavailable'],
        ['Remaining', usageAvailable ? campaign.remaining === null ? 'Uncapped (legacy)' : campaign.remaining ?? 'Unavailable' : 'Unavailable'],
      ];
      return <li key={campaign.id} className="ww-promotion-card">
        <div className="ww-promotion-summary"><dl className="ww-promotion-fields">
          {fields.map(([label, value]) => <div key={label} className={'ww-promotion-field' + (label === 'Status' && !expired ? campaign.active ? ' ww-promotion-field-active' : ' ww-promotion-field-paused' : '')}>
            <dt className="text-xs font-medium text-[#806344]">{label}</dt>
            <dd aria-label={label} className="mt-1 break-words text-sm font-semibold [overflow-wrap:anywhere]">{value}</dd>
          </div>)}
        </dl><p className="ww-promotion-expiry-summary" aria-label="Campaign expiry">{promotionExpiryLabel(campaign.expiry_date, campaign.expires_at)}</p></div>
        <div className="ww-promotion-actions">
          <Button variant="outline" className={campaign.active ? 'ww-promotion-espresso' : undefined} disabled={busy || !campaign.active && expired} title={!campaign.active && expired ? 'Expired campaigns cannot be reactivated.' : undefined} onClick={() => void perform({ action: 'set_active', id: campaign.id, active: !campaign.active })}>{campaign.active ? 'Pause' : 'Reactivate'}</Button>
          <Button variant="destructive" disabled={busy} aria-label={`Delete campaign ${campaign.campaign_name}`} onClick={() => { setError(''); setDeleting(campaign); }}>Delete</Button>
        </div>
        {!usageAvailable && <p className="sr-only">Usage reporting is unavailable for this campaign response.</p>}
      </li>;
    })}</ul>
    <AlertDialog open={!!allocation} onOpenChange={open => { if (!open && !busy) setAllocation(null); }}>
      <AlertDialogContent className="ww-promotion-confirm">
        <AlertDialogTitle>Edit total allocation — {allocationCampaign?.campaign_name}</AlertDialogTitle>
        <AlertDialogDescription>This is the total campaign limit, not additional uses. Completed uses and in-progress reservations remain counted.</AlertDialogDescription>
        <form noValidate onSubmit={event => { event.preventDefault(); void saveAllocation(); }} className="space-y-3">
          <label>Total allocation<Input type="number" min={minimumAllocation} max="100" step="1" value={allocation?.value ?? ''} disabled={busy} aria-invalid={!!allocation?.error} aria-describedby="allocation-minimum allocation-error" className={allocation?.error ? 'ww-promotion-allocation-invalid' : ''} onChange={event => setAllocation(previous => previous ? { ...previous, value: event.target.value, error: '' } : null)} /></label>
          <p id="allocation-minimum" className="text-sm">Minimum allocation is {minimumAllocation}: {allocationCampaign?.used} used and {allocationCampaign?.reserved} reserved. Choose a whole total from 0 to 100.</p>
          {minimumAllocation > 100 && <p>This legacy uncapped campaign has more commitments than the maximum editable limit. Its existing limit will remain unchanged.</p>}
          <p id="allocation-error" role={allocation?.error ? 'alert' : undefined} className="text-red-700">{allocation?.error}</p>
          <div className="flex flex-col gap-2 sm:flex-row"><Button type="submit" disabled={busy || !allocationCampaign || minimumAllocation > 100}>{busy ? 'Saving…' : 'Save allocation'}</Button><Button type="button" variant="outline" disabled={busy} onClick={() => setAllocation(null)}>Cancel</Button></div>
        </form>
      </AlertDialogContent>
    </AlertDialog>
    <AlertDialog open={!!deleting} onOpenChange={open => { if (!open && !busy) setDeleting(null); }}>
      <AlertDialogContent className="ww-promotion-confirm">
        <AlertDialogTitle>Delete campaign “{deleting?.campaign_name}”?</AlertDialogTitle>
        <AlertDialogDescription>
          Code {deleting?.code} will be removed from campaigns and cannot be reactivated or used for new redemptions.
          Existing checkout reservations may still complete or be reconciled. Redemption, payment and audit history will be retained.
        </AlertDialogDescription>
        {error && <p role="alert" className="text-red-700">{error}</p>}
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="destructive" disabled={busy} onClick={() => deleting && void perform({ action: 'delete', id: deleting.id })}>{busy ? 'Deleting…' : 'Delete campaign'}</Button>
          <Button variant="outline" disabled={busy} onClick={() => setDeleting(null)}>Cancel</Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  </section>;
}



