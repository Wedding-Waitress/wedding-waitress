export const BILLING_RESOURCES = {
 charges:{path:'/v1/charges',id:/^(?:ch|py)_[A-Za-z0-9]+$/},
 refunds:{path:'/v1/refunds',id:/^re_[A-Za-z0-9]+$/},
 disputes:{path:'/v1/disputes',id:/^(?:dp|du)_[A-Za-z0-9]+$/},
 invoices:{path:'/v1/invoices',id:/^in_[A-Za-z0-9]+$/},
 checkout_sessions:{path:'/v1/checkout/sessions',id:/^cs_live_[A-Za-z0-9]+$/},
} as const;
export type BillingResource=keyof typeof BILLING_RESOURCES;
export type LiveBillingRow={id:string;createdAt:string;amountMinor:number|null;currency:string|null;status:string;paymentIntent:string|null;chargeId:string|null;amountRefundedMinor:number;paid:boolean|null;captured:boolean|null;paymentStatus:string|null};
const ref=(value:unknown,prefix:string)=>{const id=typeof value==='string'?value:value&&typeof value==='object'?(value as {id?:unknown}).id:null;if(id===null||id===undefined)return null;if(typeof id!=='string'||!new RegExp('^'+(prefix==='ch'?'(?:ch|py)':prefix)+'_[A-Za-z0-9]+$').test(id))throw Error('Invalid provider reference');return id;};
const amount=(value:unknown):value is number=>Number.isSafeInteger(value)&&Number(value)>=0;
const status=(value:unknown)=>value===null?'unknown':typeof value==='string'&&/^[a-z_]{1,60}$/.test(value)?value:(()=>{throw Error('Invalid provider status');})();

/** A fixed GET-only surface. Never falls back to the general payment key. */
export async function readLiveBillingPage(key:string,resource:BillingResource,cursor?:string,send:typeof fetch=fetch){
 if(!/^rk_live_[A-Za-z0-9_]+$/.test(key))throw Error('Dedicated live restricted reporting credentials required');
 const spec=BILLING_RESOURCES[resource];if(!spec||cursor&&!spec.id.test(cursor))throw Error('Invalid reporting resource or cursor');
 const url=new URL('https://api.stripe.com'+spec.path);url.searchParams.set('limit','100');if(cursor)url.searchParams.set('starting_after',cursor);
 const response=await send(url.toString(),{method:'GET',headers:{Authorization:'Bearer '+key,'Stripe-Version':'2026-08-26.dahlia'},signal:AbortSignal.timeout(15000),redirect:'error'});
 if(!response.ok){await response.body?.cancel();throw Error(response.status===401?'Reporting credentials were rejected':response.status===403?'Reporting read permission is missing':response.status===429?'Reporting rate limit reached':'Stripe reporting is unavailable');}
 const result=await response.json();if(!Array.isArray(result?.data)||typeof result.has_more!=='boolean'||result.data.length>100||result.has_more&&!result.data.length)throw Error('Incomplete provider page');
 const seen=new Set<string>();
 const records:LiveBillingRow[]=result.data.map((row:Record<string,unknown>)=>{
  if(typeof row.id!=='string'||!spec.id.test(row.id)||seen.has(row.id)||row.livemode===false||resource!=='refunds'&&row.livemode!==true||!Number.isSafeInteger(row.created)||!Number.isFinite(new Date(Number(row.created)*1000).getTime()))throw Error('Invalid live provider record');seen.add(row.id);
  const value=resource==='checkout_sessions'?row.amount_total:resource==='invoices'?row.amount_paid:row.amount;
  const noAmount=resource==='checkout_sessions'&&value===null;
  if(!noAmount&&!amount(value)||row.currency!==null&&!(typeof row.currency==='string'&&/^[a-z]{3}$/.test(row.currency))||!noAmount&&row.currency===null)throw Error('Invalid provider amount or currency');
  if(resource==='charges'&&(!amount(row.amount_captured)||Number(row.amount_captured)>Number(value)||!amount(row.amount_refunded)||Number(row.amount_refunded)>Number(row.amount_captured)||typeof row.paid!=='boolean'||typeof row.captured!=='boolean'))throw Error('Invalid charge settlement fields');
  return {id:row.id,createdAt:new Date(Number(row.created)*1000).toISOString(),amountMinor:noAmount?null:resource==='charges'?Number(row.amount_captured):Number(value),currency:typeof row.currency==='string'?row.currency:null,status:status(row.status),paymentIntent:ref(row.payment_intent,'pi'),chargeId:resource==='charges'?row.id:ref(row.charge,'ch'),amountRefundedMinor:resource==='charges'?Number(row.amount_refunded):0,paid:resource==='charges'?row.paid as boolean:null,captured:resource==='charges'?row.captured as boolean:null,paymentStatus:resource==='checkout_sessions'?status(row.payment_status):null};
 });
 return {state:'available' as const,read_only:true,mode:'live' as const,resource,records,next_cursor:result.has_more?records.at(-1)!.id:null,checked_at:new Date().toISOString()};
}

