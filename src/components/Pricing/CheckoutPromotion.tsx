import React, { useEffect, useRef, useState } from 'react';
import { worldwideGstAmounts } from '../../../supabase/functions/_shared/worldwideGst';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { normalizePromotionCode, promotionPreview, type PromotionPlan } from '../../../supabase/functions/_shared/promotionRules';

export type ValidatedPromotionOffer = { code: string; percent: number; subtotalCents: number; includedCredits: number };
export function CheckoutPromotion({ planKey, onCodeChange, onOfferChange, initialCode = '' }: { planKey: PromotionPlan; onCodeChange: (code: string) => void; onOfferChange?: (offer: ValidatedPromotionOffer | null) => void; initialCode?: string }) {
  const [code, setCode] = useState(initialCode);
  const [percent, setPercent] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const revision = useRef(0);
  const edited = useRef(false);
  const callback = useRef(onCodeChange); callback.current = onCodeChange;
  const offerCallback = useRef(onOfferChange); offerCallback.current = onOfferChange;
  useEffect(() => {
    let cancelled = false;
    void supabase.auth.getUser().then(({ data }) => {
      const candidate = data.user?.user_metadata?.pending_promo_code;
      // Editable metadata is only pre-filled input; it never proves entitlement.
      if (!cancelled && !edited.current && typeof candidate === 'string' && candidate.length <= 64) {
        setCode(candidate); callback.current(candidate);
      }
    }).catch(() => { /* Manual entry remains available. */ });
    return () => { cancelled = true; revision.current++; };
  }, []);
  useEffect(() => { revision.current++; setPercent(null); setError(''); setBusy(false); offerCallback.current?.(null); }, [planKey]);
  const check = async () => {
    const current = ++revision.current;
    setBusy(true); setPercent(null); setError(''); offerCallback.current?.(null);
    try {
      const normalized = normalizePromotionCode(code);
      const result = await supabase.functions.invoke('validate-promotion', { body: { code: normalized, plan_key: planKey, purpose: 'new_plan' } });
      if (current !== revision.current) return;
      if (result.error || result.data?.success !== true) {
        // supabase-js puts non-2xx response bodies on the error context, not data.
        // Retain the server's safe rejection message instead of hiding every
        // ineligible/paused offer behind an unavailable-service message.
        let message = result.data?.error;
        const context = (result.error as unknown as { context?: Response } | null)?.context;
        if (!message && context && typeof context.clone === 'function') {
          try { const body = await context.clone().json(); if (typeof body?.error === 'string') message = body.error; } catch { /* Keep the generic fail-closed message. */ }
        }
        throw new Error(message || 'Offer validation is not available yet.');
      }
      const quote = result.data.quote;
      const expected = promotionPreview(planKey, quote.percent_off);
      if (quote.code !== normalized || quote.plan_key !== planKey || quote.currency !== 'AUD'
        || quote.subtotal_cents !== expected.subtotalCents || quote.included_credits !== expected.includedCredits) throw new Error('Offer could not be confirmed.');
      setPercent(quote.percent_off);
      offerCallback.current?.({ code: normalized, percent: quote.percent_off, subtotalCents: expected.subtotalCents, includedCredits: expected.includedCredits });
    } catch (failure) { if (current === revision.current) setError(failure instanceof Error ? failure.message : 'Offer validation failed.'); }
    finally { if (current === revision.current) setBusy(false); }
  };
  return <section className="my-4 rounded-lg border border-[#dbc6a4] p-4" aria-label="Promotional offer">
    <label htmlFor="checkout-promo">Promo code (optional)</label>
    <div className="mt-2 flex flex-wrap gap-2"><Input id="checkout-promo" placeholder="Enter your promo code" maxLength={64} value={code} onChange={event => {
      edited.current = true; revision.current++; setBusy(false); setPercent(null); setError(''); setCode(event.target.value); callback.current(event.target.value); offerCallback.current?.(null);
    }} /><Button type="button" variant="outline" disabled={busy || !code.trim()} onClick={() => void check()}>{busy ? 'Checking…' : 'Check offer'}</Button></div>
    <p className="mt-2 text-sm">You can choose a package before your trial ends. New package access starts when checkout is confirmed.</p>
    {percent !== null && <p role="status" className="mt-2 text-sm">{percent}% off · A${(worldwideGstAmounts(promotionPreview(planKey, percent).subtotalCents).totalCents / 100).toFixed(2)} including 10% GST · {promotionPreview(planKey, percent).includedCredits} included shared email/SMS credits. Your package keeps its usual limits and twelve-month duration. Checking this offer does not redeem it or activate access.</p>}
    {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
  </section>;
}
