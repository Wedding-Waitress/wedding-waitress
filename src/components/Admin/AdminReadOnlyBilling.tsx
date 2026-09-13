import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SectionCard } from '@/components/Account/SectionCard';
import { CreditCard } from 'lucide-react';

type Snapshot = { state: 'available'; read_only: true; ownerId: string; mode: 'live' | 'test'; paymentMethods: { brand: string; last4: string }[]; paymentMethodsTruncated: boolean; history: { id: string; date: string; amountMinor: number; currency: string; status: string }[]; nextCursor: string | null };
function valid(value: unknown, ownerId: string): value is Snapshot {
  if (!value || typeof value !== 'object') return false;
  const row = value as Snapshot;
  return row.state === 'available' && row.read_only === true && row.ownerId === ownerId && ['live', 'test'].includes(row.mode)
    && typeof row.paymentMethodsTruncated === 'boolean' && Array.isArray(row.paymentMethods) && row.paymentMethods.every(card => typeof card.brand === 'string' && /^\d{4}$/.test(card.last4))
    && Array.isArray(row.history) && row.history.every(invoice => /^in_[A-Za-z0-9]+$/.test(invoice.id) && Number.isFinite(Date.parse(invoice.date)) && Number.isSafeInteger(invoice.amountMinor) && invoice.amountMinor >= 0 && /^[a-z]{3}$/.test(invoice.currency) && ['draft', 'open', 'paid', 'uncollectible', 'void'].includes(invoice.status))
    && (row.nextCursor === null || /^in_[A-Za-z0-9]+$/.test(row.nextCursor));
}
export function AdminReadOnlyBilling({ ownerId }: { ownerId: string }) {
  const [cursor, setCursor] = useState<string | undefined>(), [loadedSnapshot, setSnapshot] = useState<Snapshot | null>(null), [state, setState] = useState('checking');
  const snapshot = loadedSnapshot?.ownerId === ownerId ? loadedSnapshot : null;
  useEffect(() => {
    let active = true, generation = 0, timer: number | undefined;
    const check = async () => {
      const request = ++generation; setSnapshot(null); setState('checking'); if (timer !== undefined) window.clearTimeout(timer);
      timer = window.setTimeout(() => { if (active && generation === request) { generation++; setState('unavailable'); } }, 10000);
      try {
        const result = await supabase.functions.invoke('admin-customer-preview-billing', { body: { customer_id: ownerId, ...(cursor ? { cursor } : {}), admin_grant: sessionStorage.getItem('ww_admin_grant'), admin_grant_signature: sessionStorage.getItem('ww_admin_grant_sig') } });
        if (!active || generation !== request) return;
        if (result.error || !valid(result.data, ownerId)) { setState('unavailable'); return; }
        setSnapshot(result.data); setState('available');
      } catch { if (active && generation === request) setState('unavailable'); }
      finally { if (active && generation === request && timer !== undefined) window.clearTimeout(timer); }
    };
    void check(); const focus = () => void check(); const visible = () => { if (document.visibilityState === 'visible') void check(); };
    window.addEventListener('focus', focus); document.addEventListener('visibilitychange', visible);
    return () => { active = false; generation++; if (timer !== undefined) window.clearTimeout(timer); window.removeEventListener('focus', focus); document.removeEventListener('visibilitychange', visible); };
  }, [ownerId, cursor]);
  return <SectionCard icon={CreditCard} title="Recorded billing history">
    <p>Read-only provider records. No customer portal, payment, renewal or card-management actions are available.</p>
    {state === 'checking' ? <p role="status">Verifying billing access…</p> : !snapshot ? <p>Billing history is unavailable or cannot be securely linked. This does not mean the account has no past payments.</p> : <>
      <p>Provider mode: {snapshot.mode === 'test' ? 'Test — not live payment evidence' : 'Live records — read-only'}</p>
      <h4>Saved cards</h4>{snapshot.paymentMethods.length ? <ul>{snapshot.paymentMethods.map((card, index) => <li key={index}>{card.brand} ending {card.last4}</li>)}</ul> : <p>No cards returned by this provider lookup.</p>}
      {snapshot.paymentMethodsTruncated && <p>Only the first 100 saved cards are displayed.</p>}
      <h4>Invoices</h4>{snapshot.history.length ? <div className="overflow-x-auto"><table><thead><tr>{['Date', 'Amount paid (minor units)', 'Currency', 'Status'].map(label => <th key={label} className="px-3 py-2 text-left">{label}</th>)}</tr></thead><tbody>{snapshot.history.map(invoice => <tr key={invoice.id}><td className="px-3 py-2">{new Date(invoice.date).toLocaleDateString('en-AU')}</td><td className="px-3 py-2">{invoice.amountMinor}</td><td className="px-3 py-2">{invoice.currency.toUpperCase()}</td><td className="px-3 py-2">{invoice.status}</td></tr>)}</tbody></table></div> : <p>No invoices returned on this page. One-time payments may not generate invoices.</p>}
      <nav aria-label="Read-only invoice pages">{cursor && <button onClick={() => setCursor(undefined)}>First invoice page</button>}{snapshot.nextCursor && <button className="ml-3" onClick={() => setCursor(snapshot.nextCursor!)}>Next invoice page</button>}</nav>
    </>}
  </SectionCard>;
}
