import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import Stripe from 'https://esm.sh/stripe@22.4.0';
import { reconcileRefund } from '../_shared/adminRefundService.ts';
Deno.serve(async req=>{
 if(req.method!=='POST')return new Response('Method not allowed',{status:405});
 const key=Deno.env.get('STRIPE_REFUND_RESTRICTED_KEY'),secret=Deno.env.get('STRIPE_REFUND_WEBHOOK_SECRET');
 if(Deno.env.get('ADMIN_REFUNDS_ENABLED')!=='true'||!key||!/^rk_(test|live)_/.test(key)||!secret)return new Response('Not activated',{status:503});
 const signature=req.headers.get('stripe-signature');if(!signature)return new Response('Signature required',{status:400});
 const stripe=new Stripe(key,{apiVersion:'2026-07-29.dahlia'});
 let event;try{event=await stripe.webhooks.constructEventAsync(await req.text(),signature,secret,300,Stripe.createSubtleCryptoProvider());}catch{return new Response('Invalid signature',{status:400});}
 if(!['refund.created','refund.updated','refund.failed'].includes(event.type))return new Response('Ignored',{status:200});
 if(event.livemode!==key.startsWith('rk_live_'))return new Response('Mode mismatch',{status:400});
 try{
  const refund=event.data.object as Stripe.Refund;
  const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
  // Lookup by persisted provider identity or our opaque request metadata. Unknown external refunds are not adopted.
  const id=refund.metadata?.ww_refund_request;
  if(!id)return new Response('Unmanaged refund',{status:200});
  const {data:record,error}=await admin.from('admin_payment_refunds').select('*').eq('id',id).maybeSingle();
  if(error)throw error;if(!record)return new Response('Unmanaged refund',{status:200});
  await reconcileRefund(admin,stripe,{...record,stripe_refund_id:refund.id});
  return new Response('Recorded',{status:200});
 }catch{return new Response('Reconciliation not confirmed',{status:503});}
});
