import type {LiveBillingRow} from '../../supabase/functions/_shared/adminLiveBilling';
export type RecordedBillingPayment={id:string;payment_type:string;amount_paid:number;status:string;stripe_reference:string|null;customer_name?:string};
export type ReconciledPayment={payment:RecordedBillingPayment;state:string;detail:string;providerId:string|null};
export function reconcileRecordedPayments(payments:RecordedBillingPayment[],charges:LiveBillingRow[],sessions:LiveBillingRow[],complete:{charges:boolean;sessions:boolean}):ReconciledPayment[]{
 return payments.map(payment=>{
  const reference=payment.stripe_reference;
  const result=(state:string,detail:string,providerId:string|null=null)=>({payment,state,detail,providerId});
  if(!reference)return result('not_recorded','No provider reference was recorded.');
  const session=sessions.find(row=>row.id===reference);
  const intent=session?.paymentIntent||(/^pi_/.test(reference)?reference:null);
  const candidates=charges.filter(row=>row.id===reference||intent&&row.paymentIntent===intent);
  const settled=candidates.filter(row=>row.status==='succeeded'&&row.paid===true&&row.captured===true);
  if(settled.length>1)return result('review','Multiple captured charges match this reference. Review the recorded purchases.');
  const expected=Math.round(Number(payment.amount_paid)*100);
  if(!Number.isSafeInteger(expected)||expected<0)return result('review','The recorded amount could not be checked.');
  const paidInDatabase=['succeeded','completed','paid'].includes(payment.status);
  const charge=settled[0];
  if(charge){
   if(charge.currency!=='aud')return result('currency_mismatch','The recorded AUD amount cannot be equated to this provider currency.',charge.id);
   if(charge.amountMinor!==expected)return result('amount_mismatch','The captured payment amount differs from this recorded purchase. Shared payment references may need review.',charge.id);
   if(!paidInDatabase)return result('database_pending','Stripe shows a captured payment; this database record is not marked paid.',charge.id);
   if(charge.amountRefundedMinor>0)return result(charge.amountRefundedMinor===charge.amountMinor?'refunded':'partially_refunded','Stripe records a refund against this captured payment.',charge.id);
   return result('matched','Recorded reference, captured AUD amount and paid status match.',charge.id);
  }
  if(session?.status==='complete'&&session.paymentStatus==='no_payment_required'&&session.amountMinor===0){
   return expected===0&&paidInDatabase?result('matched_no_charge','Stripe confirms a completed checkout requiring no payment.',session.id):result('review','The no-payment checkout differs from the recorded amount or status.',session.id);
  }
  if(!complete.charges||reference.startsWith('cs_')&&!complete.sessions)return result('not_checked','Older provider pages remain unchecked.');
  if(candidates.length||session)return result('not_captured','No matching captured payment is confirmed.',session?.id||candidates[0]?.id||null);
  return result('no_match','No matching provider record was found in the fully loaded charge and checkout history.');
 });
}

export function findUnrecordedCapturedCharges(payments:RecordedBillingPayment[],charges:LiveBillingRow[],sessions:LiveBillingRow[],sessionsComplete:boolean){
 const references=new Set(payments.map(payment=>payment.stripe_reference).filter(Boolean));
 const linkedIntents=new Set(sessions.filter(session=>references.has(session.id)).map(session=>session.paymentIntent).filter(Boolean));
 const unresolvedCheckout=!sessionsComplete&&payments.some(payment=>payment.stripe_reference?.startsWith('cs_')&&!sessions.some(session=>session.id===payment.stripe_reference));
 return charges.filter(charge=>charge.status==='succeeded'&&charge.paid===true&&charge.captured===true&&!references.has(charge.id)&&!references.has(charge.paymentIntent)&&!linkedIntents.has(charge.paymentIntent)).map(charge=>({charge,state:unresolvedCheckout?'not_checked':'unmatched',detail:unresolvedCheckout?'Older checkout references remain unchecked.':'No application payment reference matches this captured charge. It may be a payment outside Wedding Waitress; no access change is inferred.'}));
}
