import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { isOwnerAdminEmail } from '../_shared/owner-admin.ts';
const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,x-client-info,apikey,content-type','Content-Type':'application/json'};
const reply=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers});
const sources={
  tickets:['support_tickets','id,customer_id,event_id,full_name,contact_email,category,message,source,status,created_at,updated_at','created_at'],
  support_activity:['support_ticket_activity','id,ticket_id,actor_id,status,reason,recorded_at','recorded_at'],
  emails:['email_send_log','id,customer_id,event_id,support_ticket_id,template_name,purpose,provider,status,created_at,accepted_at,delivered_at','created_at'],
  email_queue:['transactional_email_queue','id,queue_name,status,attempts,available_at,locked_at,created_at,updated_at','created_at'],
  guest_notifications:['guest_addition_notifications','id,event_id,email_status,sms_status,email_provider,sms_provider,email_queued_at,sms_queued_at,created_at','created_at'],
  balances:['sms_credits','id,user_id,event_id,total,used,remaining,updated_at','updated_at'],
  usage:['communication_usage','id,user_id,event_id,channel,cost_aud,sent_at,status,edge_function_name','sent_at'],
  credit_transactions:['credit_transactions','id,user_id,amount,kind,created_at','created_at'],
  purchases:['rsvp_invite_purchases','id,user_id,event_id,purchase_type,amount_paid,status,created_at','created_at'],
  admin_activity:['admin_action_audit','id,administrator_id,action,target_type,target_id,reason,result,created_at','created_at'],
  lifecycle_activity:['account_lifecycle_audit','id,account_owner_id,actor_user_id,action,occurred_at','occurred_at'],
  customers:['profiles','id,first_name,last_name','created_at'],
  events:['events','id,user_id,name','created_at'],
} as const;
Deno.serve(async req=>{
  if(req.method==='OPTIONS')return new Response(null,{headers});
  if(req.method!=='POST')return reply({error:'Method not allowed'},405);
  try {
    const auth=req.headers.get('Authorization');if(!auth?.startsWith('Bearer '))return reply({error:'Administrator authentication required'},401);
    const url=Deno.env.get('SUPABASE_URL')!,anon=Deno.env.get('SUPABASE_ANON_KEY')!,key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const caller=createClient(url,anon,{global:{headers:{Authorization:auth}}});
    const {data,error}=await caller.auth.getClaims(auth.slice(7));
    if(error||!data?.claims||!isOwnerAdminEmail(data.claims.email)||data.claims.is_anonymous===true)return reply({error:'Administrator access denied'},403);
    const {data:owner}=await caller.rpc('is_owner_admin');if(owner!==true)return reply({error:'Administrator access denied'},403);
    const body=await req.json(),grant=String(body.admin_grant||''),signature=String(body.admin_grant_signature||'');
    const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(`${grant}|${key}`));
    const expected=Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,'0')).join('');
    if(!grant||!signature||signature!==expected)return reply({error:'Recent administrator verification required'},403);
    let decoded:{user_id?:string;exp?:number};try{decoded=JSON.parse(atob(grant));}catch{return reply({error:'Invalid administrator verification'},403);}
    if(decoded.user_id!==data.claims.sub||Number(decoded.exp)<=Date.now()||!Number.isFinite(Number(decoded.exp)))return reply({error:'Administrator verification expired'},403);
    const admin=createClient(url,key,{auth:{persistSession:false}}),records:Record<string,unknown>={},availability:Record<string,string>={};
    await Promise.all(Object.entries(sources).map(async([name,[table,columns,order]])=>{
      const result=await admin.from(table).select(columns).order(order,{ascending:false}).limit(500);
      if(result.error){availability[name]='unavailable';records[name]=null;}else{availability[name]='available';records[name]=result.data||[];}
    }));
    const queue:Record<string,number|null>={};
    await Promise.all(['pending','processing','sent','failed'].map(async status=>{
      const result=await admin.from('transactional_email_queue').select('id',{count:'exact',head:true}).eq('status',status);
      queue[status]=result.error?null:result.count;
    }));
    return reply({generated_at:new Date().toISOString(),records,availability,row_limit:500,queue,
      configuration:{email_provider_configured:!!Deno.env.get('RESEND_API_KEY'),delivery_signature_configured:!!Deno.env.get('RESEND_WEBHOOK_SECRET'),queue_secret_configured:!!Deno.env.get('TRANSACTIONAL_EMAIL_PROCESSOR_SECRET')},
      limitations:['Configuration presence does not prove provider availability.','SMS sent/accepted is not carrier delivery confirmation.','Up to 500 most recent rows per source; no historical records are inferred.','Provider error bodies are intentionally not exposed.']});
  }catch{return reply({error:'Operational reporting could not be checked'},503);}
});
