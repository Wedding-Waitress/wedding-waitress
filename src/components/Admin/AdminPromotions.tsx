import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { normalizePromotionCode, promotionPreview, validatePromotionPercent } from '../../../supabase/functions/_shared/promotionRules';

type Campaign = { id: string; code: string; campaign_name: string; percent_off: number; active: boolean };

export function AdminPromotions() {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [percent, setPercent] = useState('50');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const discount = Number(percent);
  const valid = Number.isInteger(discount) && discount >= 1 && discount <= 100;
  const request = async (body: Record<string, unknown>) => {
    const result = await supabase.functions.invoke('admin-promotions', { body: { ...body,
      admin_grant: sessionStorage.getItem('ww_admin_grant'), admin_grant_signature: sessionStorage.getItem('ww_admin_grant_sig') } });
    if (result.error || result.data?.success !== true) throw new Error(result.data?.error || 'Promotion management is unavailable.');
    return result.data.data;
  };
  const perform = async (body: Record<string, unknown>) => {
    if (busy) return;
    setBusy(true); setError('');
    try {
      if (body.action === 'create') { normalizePromotionCode(code); validatePromotionPercent(discount); }
      const data = await request(body);
      if (body.action === 'list') setCampaigns(data);
      else { setCampaigns(previous => [data, ...previous.filter(campaign => campaign.id !== data.id)]); if (body.action === 'create') { setCode(''); setName(''); } }
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Promotion could not be confirmed.'); }
    finally { setBusy(false); }
  };
  return <section className="mt-6 rounded-xl border border-[#dbc6a4] bg-[#fffdf8] p-5 text-[#2f1b14]" aria-labelledby="promotions-heading">
    <h2 id="promotions-heading" className="text-xl font-semibold">Promotions &amp; Codes</h2>
    <p className="my-2 text-sm">Public campaign codes apply once per verified email, to a first package purchase only. Pausing a code does not reset earlier uses.</p>
    <p className="my-2 text-sm" role="note">Local preparation: promotional checkout and activation are not yet available.</p>
    <form onSubmit={event => { event.preventDefault(); void perform({ action: 'create', code, campaign_name: name, percent_off: discount }); }} className="grid gap-3 md:grid-cols-3">
      <label>Campaign name<Input value={name} onChange={event => setName(event.target.value)} required maxLength={120} disabled={busy} /></label>
      <label>Promo code<Input placeholder="Enter your chosen code" value={code} onChange={event => setCode(event.target.value)} required maxLength={64} disabled={busy} /></label>
      <label>Discount (%)<Input type="number" min="1" max="100" step="1" value={percent} onChange={event => setPercent(event.target.value)} required disabled={busy} aria-describedby="promotion-credit-reminder" /></label>
      <aside id="promotion-credit-reminder" aria-label="Email and SMS credit reminder" className="md:col-span-3 rounded-lg border border-[#dbc6a4] bg-[#f6efdf] p-3 text-sm leading-6">
        <p className="font-semibold">Email &amp; SMS credit reminder</p>
        <p><strong>1–50% off:</strong> Full package Email &amp; SMS credits are included.</p>
        <p><strong>51–100% off:</strong> Zero new Email &amp; SMS credits are included. Customers must purchase sending-credit top-ups. Existing purchased credits are not removed.</p>
      </aside>
      <div className="md:col-span-3 text-sm">{valid ? `${discount}% off. ${discount <= 50 ? 'Normal package sending credits included.' : 'Zero new included email/SMS credits. Purchased top-ups remain available.'}` : 'Choose a whole percentage from 1 to 100.'}</div>
      {valid && <div className="md:col-span-3 grid gap-2 sm:grid-cols-3">{(['essential', 'premium', 'unlimited'] as const).map(plan => {
        const quote = promotionPreview(plan, discount);
        return <div key={plan} className="rounded-lg border border-[#dbc6a4] p-3"><strong>{plan === 'unlimited' ? 'Ultimate' : plan[0].toUpperCase() + plan.slice(1)}</strong><p>A${(quote.subtotalCents / 100).toFixed(2)} excluding GST</p><p>{quote.guestLimit} guests · {quote.includedCredits} shared email/SMS credits</p><p>12 months · all planning tools</p></div>;
      })}</div>}
      <div className="md:col-span-3 flex flex-wrap gap-3"><Button type="submit" disabled={busy || !valid}>Create promo code</Button><Button type="button" variant="outline" disabled={busy} onClick={() => void perform({ action: 'list' })}>Load campaigns</Button></div>
    </form>
    {error && <p role="alert" className="mt-3 text-red-700">{error}</p>}
    <ul className="mt-4 space-y-2">{campaigns.map(campaign => <li key={campaign.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#dbc6a4] p-3"><span><strong>{campaign.campaign_name}</strong> · {campaign.code} · {campaign.percent_off}% · {campaign.active ? 'Active' : 'Paused'}</span><Button variant="outline" disabled={busy} onClick={() => void perform({ action: 'set_active', id: campaign.id, active: !campaign.active })}>{campaign.active ? 'Pause code' : 'Reactivate code'}</Button></li>)}</ul>
  </section>;
}
