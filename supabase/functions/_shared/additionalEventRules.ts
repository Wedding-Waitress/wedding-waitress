import { worldwideGstAmounts, validateWorldwideGstTotal } from './worldwideGst.ts';
export const ADDITIONAL_EVENT_PRODUCT = 'ww_live_20260914_v2_additional_event';
export const ADDITIONAL_EVENT_LEGACY_PRICE = 'price_1UFTqL5GzTmqOxGKgPWVdCwr';
export const ADDITIONAL_EVENT_VERSION = 'ww_additional_event_99_total_v1';
export const ADDITIONAL_EVENT_BASE_CENTS = 9000;
const idOf = (value: any) => typeof value === 'string' ? value : value?.id;
/** Retrieved Stripe objects only. Browser input never supplies an amount/version binding. */
export function validateAdditionalEventQuote(session: any, line: any, live = true) {
 const version=session?.metadata?.additional_event_version;
 const current=version===ADDITIONAL_EVENT_VERSION;
 const legacy=!version&&line?.price?.id===ADDITIONAL_EVENT_LEGACY_PRICE;
 const price=line?.price,baseCents=current?ADDITIONAL_EVENT_BASE_CENTS:9900;
 if ((!current&&!legacy)||session?.object!=='checkout.session'||session.livemode!==live
  ||!(live?/^cs_live_[A-Za-z0-9]+$/:/^cs_test_[A-Za-z0-9]+$/).test(session.id||'')
  ||session.mode!=='payment'||session.metadata?.purchase_type!=='additional_event'
  ||session.currency!=='aud'||line?.quantity!==1||!/^price_[A-Za-z0-9]+$/.test(price?.id||'')
  ||price.livemode!==live||price.currency!=='aud'||price.unit_amount!==baseCents
  ||idOf(price.product)!==ADDITIONAL_EVENT_PRODUCT
  ||current&&(price.id===ADDITIONAL_EVENT_LEGACY_PRICE||price.tax_behavior!=='exclusive')
  ||session.total_details?.amount_discount!==0||session.total_details?.amount_shipping!==0
  ||session.amount_subtotal!==baseCents||line.amount_subtotal!==baseCents) throw new Error('Additional-event price does not match its approved version.');
 validateWorldwideGstTotal(baseCents,1,0,session.amount_total,session.total_details.amount_tax);
 return {current,baseCents,...worldwideGstAmounts(baseCents)};
}
/** Save the server-created session's immutable quote before returning its URL/secret. */
export async function recordAdditionalEventQuote(admin: any,stripe: any,sessionId: string,userId: string) {
 const session=await stripe.checkout.sessions.retrieve(sessionId,{expand:['line_items.data.price']});
 try {
  if(session.metadata?.user_id!==userId||session.line_items?.has_more!==false||session.line_items.data.length!==1) throw new Error('Additional-event quote ownership is invalid.');
  const quote=validateAdditionalEventQuote(session,session.line_items.data[0]);
  if(!quote.current)throw new Error('New additional events require the current price version.');
  const {data,error}=await admin.rpc('record_additional_event_checkout_quote',{_user_id:userId,_stripe_session_id:session.id,_stripe_price_id:session.line_items.data[0].price.id,_catalogue_version:ADDITIONAL_EVENT_VERSION});
  if(error||data?.recorded!==true||data?.total_cents!==9900)throw new Error('Additional-event price could not be recorded.');
  return quote;
 } catch(error) {
  // A URL or client secret is never exposed unless its quote was durably bound.
  if(session.status==='open')await stripe.checkout.sessions.expire(session.id);
  throw error;
 }
}
