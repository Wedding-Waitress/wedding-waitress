import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@18.5.0';
import { isOwnerAdminEmail } from '../_shared/owner-admin.ts';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,x-client-info,apikey,content-type','Content-Type':'application/json'};
const response=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:cors});
async function sha256(value:string){const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));return Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,'0')).join('');}

Deno.serve(async(req)=>{
  if(req.method==='OPTIONS')return new Response(null,{headers:cors});
  const reference=crypto.randomUUID();
  try{
    const auth=req.headers.get('Authorization');if(!auth?.startsWith('Bearer '))return response({error:'Administrator authentication required.'},401);
    const url=Deno.env.get('SUPABASE_URL')!,anon=Deno.env.get('SUPABASE_ANON_KEY')!,serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const userClient=createClient(url,anon,{global:{headers:{Authorization:auth}}});const token=auth.slice(7);const {data:claims,error:claimsError}=await userClient.auth.getClaims(token);
    if(claimsError||!claims?.claims||!isOwnerAdminEmail(claims.claims.email))return response({error:'Administrator access denied.'},403);
    const {data:isAdmin}=await userClient.rpc('is_owner_admin');if(isAdmin!==true)return response({error:'Administrator access denied.'},403);
    const actor=String(claims.claims.sub);const body=await req.json();const action=String(body.action||''),target=String(body.target_id||''),reason=String(body.reason||'').trim(),grant=String(body.admin_grant||''),signature=String(body.admin_grant_signature||'');
    if(!target||reason.length<5)return response({error:'A target and administrator reason are required.'},400);
    if(!grant||!signature||await sha256(`${grant}|${serviceKey}`)!==signature)return response({error:'Recent administrator verification is required.'},403);
    let decoded:{user_id?:string;exp?:number};try{decoded=JSON.parse(atob(grant));}catch{return response({error:'Recent administrator verification is required.'},403);}
    if(decoded.user_id!==actor||Number(decoded.exp)<=Date.now())return response({error:'Administrator verification has expired. Verify again before continuing.'},403);
    const admin=createClient(url,serviceKey,{auth:{persistSession:false}});
    if(['suspend','restore'].includes(action)){
      const {data,error}=await admin.rpc('admin_set_account_control',{p_target:target,p_action:action,p_reason:reason,p_actor:actor,p_safe_error_reference:null});if(error)throw error;return response({success:true,result:data});
    }
    if(action==='force_sign_out'){
      const {error}=await admin.rpc('admin_force_account_sign_out',{p_target:target,p_reason:reason,p_actor:actor});if(error)throw error;return response({success:true});
    }
    if(action==='resend_email_verification'){
      const {data:{user:targetUser},error:userError}=await admin.auth.admin.getUserById(target);if(userError||!targetUser?.email)return response({error:'Customer identity could not be confirmed.'},404);
      const {error:resendError}=await admin.auth.resend({type:'signup',email:targetUser.email});if(resendError)throw resendError;
      await admin.from('admin_action_audit').insert({administrator_id:actor,action,target_type:'account',target_id:target,reason,previous_state:{email_confirmed_at:targetUser.email_confirmed_at},new_state:{verification_resent:true},result:'succeeded'});return response({success:true});
    }
    if(['approve_vendor','reject_vendor'].includes(action)){
      const next=action==='approve_vendor'?{status:'active',is_read_only:false,updated_at:new Date().toISOString()}:{status:'rejected',is_read_only:true,updated_at:new Date().toISOString()};
      const {data:before,error:readError}=await admin.from('user_subscriptions').select('id,status,is_read_only,plan_id,user_id').eq('id',target).single();if(readError)throw readError;
      const {data:after,error:updateError}=await admin.from('user_subscriptions').update(next).eq('id',target).select('id,status,is_read_only,plan_id,user_id').single();if(updateError)throw updateError;
      await admin.from('admin_action_audit').insert({administrator_id:actor,action,target_type:'subscription',target_id:target,reason,previous_state:before,new_state:after,result:'succeeded'});return response({success:true,result:after});
    }
    if(['reactivate_account','delay_permanent_deletion','add_note'].includes(action)){
      const {data,error}=await admin.rpc('admin_lifecycle_action',{p_target:target,p_action:action,p_reason:reason,p_actor:actor});if(error)throw error;return response({success:true,result:data});
    }
    if(action==='permanently_delete_now'){
      const {error}=await admin.rpc('admin_lifecycle_action',{p_target:target,p_action:'schedule_immediate_purge',p_reason:reason,p_actor:actor});if(error)throw error;
      const {error:purgeError}=await admin.functions.invoke('purge-closed-accounts',{body:{account_owner_id:target,source:'verified_admin'}});if(purgeError)throw purgeError;return response({success:true});
    }
    if(action==='retry_stripe_cancellation'||action==='close_account'){
      const stripeKey=Deno.env.get('STRIPE_SECRET_KEY');if(!stripeKey)return response({error:'Stripe cancellation is not configured. No account state was changed.'},503);
      const {data:{user:targetUser},error:userError}=await admin.auth.admin.getUserById(target);if(userError||!targetUser?.email)return response({error:'Customer identity could not be confirmed. No account state was changed.'},404);
      const stripe=new Stripe(stripeKey,{apiVersion:'2025-08-27.basil'});const customers=await stripe.customers.list({email:targetUser.email,limit:1});let cancelled=true;if(customers.data[0]){const subscriptions=await stripe.subscriptions.list({customer:customers.data[0].id,status:'all',limit:100});for(const sub of subscriptions.data.filter(item=>['active','trialing','past_due','unpaid'].includes(item.status))){try{await stripe.subscriptions.cancel(sub.id);}catch{cancelled=false;}}}
      if(!cancelled)return response({error:'Stripe did not confirm every cancellation. Account closure was not reported as successful.'},502);
      if(action==='close_account'){const {error}=await admin.rpc('schedule_account_closure',{p_user_id:target,p_stripe_cancelled:true,p_processing_error:null,p_metadata:{source:'verified_admin',administrator_id:actor,reason}});if(error)throw error;}
      await admin.from('admin_action_audit').insert({administrator_id:actor,action,target_type:'account',target_id:target,reason,previous_state:{},new_state:{stripe_cancelled:true},result:'succeeded'});return response({success:true});
    }
    return response({error:'This administrator action is not supported.'},400);
  }catch(error){console.error('[admin-account-action]',reference,error);return response({error:`The action failed. Nothing is confirmed. Reference ${reference}.`},500);}
});
