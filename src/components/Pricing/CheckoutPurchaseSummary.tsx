import '@/styles/AccountPurchaseHelp.css';
import React from 'react';
import { worldwideGstAmounts } from '../../../supabase/functions/_shared/worldwideGst';
import { PLAN_DETAILS, type PlanKey } from '@/lib/upgradePlans';
import { PLAN_COMMUNICATION_CREDITS } from '@/lib/communicationCredits';
import type { ValidatedPromotionOffer } from './CheckoutPromotion';
export function CheckoutPurchaseSummary({planKey,purpose,baseAmount,offer,awaitingOffer}:{planKey:PlanKey;purpose:string;baseAmount:number;offer:ValidatedPromotionOffer|null;awaitingOffer:boolean}){
 const subtotal=offer?.subtotalCents??Math.round(baseAmount*100);
 const total=worldwideGstAmounts(subtotal).totalCents;
 const credits=offer?.includedCredits??PLAN_COMMUNICATION_CREDITS[planKey];
 return <section aria-label="Purchase summary" className="my-5 max-w-xl rounded-xl border border-[#dbc6a4] bg-white p-5">
  <h2 className="text-lg font-semibold">Your purchase</h2>
  <dl className="mt-3 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-x-4 gap-y-3 text-sm">
   <dt>Package</dt><dd className="text-right font-semibold">{PLAN_DETAILS[planKey].name}</dd>
   <dt>Events</dt><dd className="text-right">{purpose==='upgrade'?'Existing event retained':'1 event included'}</dd>
   <dt>Access</dt><dd className="text-right">{purpose==='upgrade'?'Original expiry retained':'12 months'}</dd>
   <dt>Discount</dt><dd className="text-right">{awaitingOffer?'Awaiting code verification':offer?offer.percent+'% off':'None'}</dd>
   <dt>Total including 10% GST</dt><dd className="text-right font-semibold">{awaitingOffer?'Confirm promo code':'A$'+(total/100).toFixed(2)}</dd>
   <dt>Shared Email &amp; SMS credits</dt><dd className="text-right">{awaitingOffer?'Confirm promo code':purpose==='upgrade'?'Existing credit balance retained':credits+' included'}</dd>
  </dl>
  {!awaitingOffer&&credits===0&&purpose!=='upgrade'&&<p className="mt-3 text-sm">No complimentary credits with this offer. You can buy credits when needed.</p>}
 </section>;
}
