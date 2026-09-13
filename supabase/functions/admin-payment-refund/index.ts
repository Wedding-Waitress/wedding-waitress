import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import Stripe from 'https://esm.sh/stripe@22.4.0';
import { isOwnerAdminEmail } from '../_shared/owner-admin.ts';
import { resolveRefundPayment, submitRefund, reconcileRefund } from '../_shared/adminRefundService.ts';
const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,x-client-info,apikey,content-type','Content-Type':'application/json'};
const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers});
const safeRecord=(r:any)=>({id:r.id,payment_id:r.payment_id,payment_type:r.payment_type,amount_minor:Number(r.amount_minor),currency:r.currency,status:r.status,access_choice:r.access_choice,access_status:r.access_status,reason:r.reason,created_at:r.created_at});
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response(null,{headers});
 if(req.method!=='POST')return reply({error:'Method not allowed.'},405);
 try{
  const authorization=req.headers.get('Authorization');if(!authorization?.startsWith('Bearer '))return reply({error:'Administrator authentication required.'},401);
  const url=Deno.env.get('SUPABASE_URL')!,anon=Deno.env.get('SUPABASE_ANON_KEY')!,service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const caller=createClient(url,anon,{global:{headers:{Authorization:authorization}}});
  const {data:claims,error:claimsError}=await caller.auth.getClaims(authorization.slice(7));
  if(claimsError||!claims?.claims||claims.claims.is_anonymous===true||!isOwnerAdminEmail(claims.claims.email))return reply({error:'Owner administrator required.'},403);
  const {data:isOwner}=await caller.rpc('is_owner_admin');if(isOwner!==true)return reply({error:'Owner administrator required.'},403);
  const body=await req.json(), grant=String(body.admin_grant||''),signature=String(body.admin_grant_signature||'');
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(`${grant}|${service}`));
  const expected=Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,'0')).join('');
  if(!grant||!signature||signature!==expected)return reply({error:'Recent administrator verification required.'},403);
  let verified:{user_id?:string;exp?:number};try{verified=JSON.parse(atob(grant));}catch{return reply({error:'Administrator verification required.'},403);}
  if(verified.user_id!==claims.claims.sub||!Number.isFinite(Number(verified.exp))||Number(verified.exp)<=Date.now())return reply({error:'Administrator verification expired.'},403);
  // Off until separately reviewed and enabled. Never fall back to a general Stripe secret.
  const key=Deno.env.get('STRIPE_REFUND_RESTRICTED_KEY');
  if(Deno.env.get('ADMIN_REFUNDS_ENABLED')!=='true'||!key||!/^rk_(test|live)_/.test(key))return reply({error:'Refunds are not activated. No refund or access change was made.'},503);
  const admin=createClient(url,service,{auth:{persistSession:false}}),stripe=new Stripe(key,{apiVersion:'2026-07-29.dahlia'}), live=key.startsWith('rk_live_');
  if(body.action==='history'){
   const {data,error}=await admin.from('admin_payment_refunds').select('*').order('created_at',{ascending:false}).limit(100);
   if(error)throw new Error('Refund history is unavailable.');
   const purchases=await admin.from('paid_plan_purchases').select('id,user_id,amount_total_cents,fulfilled_at').order('fulfilled_at',{ascending:false}).limit(100);
   if(purchases.error)throw new Error('Verified plan purchase history is unavailable.');
   const payments=await Promise.all((purchases.data||[]).map(async p=>{
    const profile=await admin.from('profiles').select('first_name,last_name,email').eq('id',p.user_id).maybeSingle();
    if(profile.error)throw new Error('Customer identity is unavailable.');
    return {id:p.id,payment_type:'verified_plan_purchase',customer_name:[profile.data?.first_name,profile.data?.last_name].filter(Boolean).join(' ')||'Recorded customer',email:profile.data?.email||null,amount_minor:p.amount_total_cents};
   }));
   return reply({success:true,records:(data||[]).map(safeRecord),payments,limit:100});
  }
  if(body.action==='refresh'){
   const {data:record,error}=await admin.from('admin_payment_refunds').select('*').eq('id',body.request_id).single();
   if(error||!record)throw new Error('Refund record is unavailable.');
   return reply({success:true,record:safeRecord(await reconcileRefund(admin,stripe,record))});
  }
  if(body.action==='quote'){
   const {payment,charge,remaining}=await resolveRefundPayment(admin,stripe,body.payment_type,body.payment_id,live);
   const outstanding=await admin.from('admin_payment_refunds').select('id').eq('charge_id',charge.id).in('status',['submitting','unknown','pending','requires_action']);
   if(outstanding.error)throw new Error('Outstanding refund state is unavailable.');
   return reply({success:true,quote:{account_owner_id:payment.user_id,original_minor:charge.amount,refunded_minor:charge.amount_refunded,remaining_minor:remaining,currency:'aud',livemode:live,blocked:!!outstanding.data?.length}});
  }
  if(body.action==='submit')return reply({success:true,record:safeRecord(await submitRefund(admin,stripe,String(claims.claims.sub),body,live))});
  return reply({error:'Unsupported refund action.'},400);
 }catch(error){
  // Provider responses, secrets and customer financial details never reach browser/logs.
  const reference=crypto.randomUUID();console.error('[admin-payment-refund]',reference);
  const message=error instanceof Error && !('type' in error)?error.message:'Refund could not be confirmed. Check refund history before retrying.';
  return reply({error:message,reference},503);
 }
});
