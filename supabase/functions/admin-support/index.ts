import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { isOwnerAdminEmail } from '../_shared/owner-admin.ts';
import { hasRecentAdminVerification } from '../_shared/adminVerifiedSession.ts';
import { parseOperationalCursor } from '../_shared/adminOperationalPagination.ts';

const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,x-client-info,apikey,content-type','Content-Type':'application/json','Cache-Control':'no-store'};
const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers});
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const allowed=new Set(['action','ticket_id','priority','message','reason','reply_id','reviewed_recipient','cursor','admin_grant','admin_grant_signature']);
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response(null,{headers});
 if(req.method!=='POST')return reply({error:'Method not allowed.'},405);
 try{
  const auth=req.headers.get('Authorization');if(!auth?.startsWith('Bearer '))return reply({error:'Administrator authentication required.'},401);
  const url=Deno.env.get('SUPABASE_URL')!,anon=Deno.env.get('SUPABASE_ANON_KEY')!,service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const caller=createClient(url,anon,{global:{headers:{Authorization:auth}},auth:{persistSession:false}});
  const {data:identity,error:identityError}=await caller.auth.getClaims(auth.slice(7));
  const claims=identity?.claims;
  if(identityError||!claims||claims.is_anonymous===true||!isOwnerAdminEmail(claims.email))return reply({error:'Owner administrator required.'},403);
  const {data:owner,error:ownerError}=await caller.rpc('is_owner_admin');
  if(ownerError||owner!==true||!await hasRecentAdminVerification(caller))return reply({error:'Recent administrator verification required.'},403);
  const body=await req.json();
  if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(name=>!allowed.has(name)))return reply({error:'Invalid support request.'},400);
  const grant=body.admin_grant,signature=body.admin_grant_signature;
  if(typeof grant!=='string'||typeof signature!=='string'||!grant||!signature)return reply({error:'Administrator verification required.'},403);
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(grant+'|'+service));
  const expected=Array.from(new Uint8Array(digest)).map(byte=>byte.toString(16).padStart(2,'0')).join('');
  if(signature.length!==expected.length||[...expected].reduce((n,c,i)=>n|(c.charCodeAt(0)^signature.charCodeAt(i)),0)!==0)return reply({error:'Administrator verification required.'},403);
  let decoded:{user_id?:string;session_id?:string;exp?:number};try{decoded=JSON.parse(atob(grant));}catch{return reply({error:'Administrator verification required.'},403);}
  if(decoded.user_id!==claims.sub||decoded.session_id!==claims.session_id||typeof decoded.exp!=='number'||!Number.isFinite(decoded.exp)||decoded.exp<=Date.now())return reply({error:'Administrator verification expired.'},403);
  const ticket=body.ticket_id;
  if(typeof ticket!=='string'||!uuid.test(ticket)||!['history','priority','reply'].includes(body.action))return reply({error:'Invalid support ticket or action.'},400);
  let cursor:ReturnType<typeof parseOperationalCursor>|null=null;
  if(body.cursor!==undefined){try{cursor=parseOperationalCursor(body.cursor);if(cursor.at===null)throw Error('Missing time');}catch{return reply({error:'Invalid reply history cursor.'},400);}}
  const admin=createClient(url,service,{auth:{persistSession:false}});
  if(body.action==='history'){
   let query=admin.from('support_ticket_replies').select('id,message,reason,actor_id,created_at,email:email_send_log!support_ticket_replies_message_id_fkey(status,accepted_at,delivered_at)').eq('ticket_id',ticket).order('created_at',{ascending:false}).order('id',{ascending:false});
   if(cursor)query=query.or('created_at.lt.'+cursor.at+',and(created_at.eq.'+cursor.at+',id.lt.'+cursor.id+')');
   const {data,error}=await query.limit(51);if(error)return reply({error:'Reply history could not be read.'},503);
   const rows=(data||[]).slice(0,50),last=rows.at(-1),hasMore=(data||[]).length>50;
   return reply({replies:rows.map(row=>{const email=Array.isArray(row.email)?row.email[0]:row.email;return {id:row.id,message:row.message,reason:row.reason,actor_id:row.actor_id,created_at:row.created_at,status:email?.status||'unknown',accepted_at:email?.accepted_at||null,delivered_at:email?.delivered_at||null};}),has_more:hasMore,cursor:hasMore&&last?{at:last.created_at,id:last.id}:null});
  }
  const reason=typeof body.reason==='string'?body.reason.trim():'';
  if(reason.length<5||reason.length>1000)return reply({error:'An audit reason of 5 to 1000 characters is required.'},400);
  if(body.action==='priority'){
   if(!['low','normal','high','urgent'].includes(body.priority))return reply({error:'Invalid priority.'},400);
   const {data,error}=await admin.rpc('admin_set_support_priority',{p_ticket:ticket,p_actor:claims.sub,p_priority:body.priority,p_reason:reason});
   return error||data!==true?reply({error:'Priority change could not be confirmed.'},503):reply({success:true,priority:body.priority});
  }
  const message=typeof body.message==='string'?body.message.trim():'';
  if(!uuid.test(String(body.reply_id||''))||message.length<5||message.length>5000||body.reviewed_recipient!==true)return reply({error:'Review the recorded recipient and provide a reply of 5 to 5000 characters.'},400);
  const secret=Deno.env.get('TRANSACTIONAL_EMAIL_PROCESSOR_SECRET');
  if(!secret||!Deno.env.get('RESEND_API_KEY'))return reply({error:'Support email delivery is not configured. No reply was queued.'},503);
  const {data:prepared,error:prepareError}=await admin.rpc('admin_prepare_support_reply',{p_ticket:ticket,p_actor:claims.sub,p_reply_id:body.reply_id,p_message:message,p_reason:reason});
  if(prepareError||prepared?.recorded!==true)return reply({error:prepareError?.code==='P0001'?'The recorded recipient is suppressed. No reply was sent.':prepareError?.code==='22023'?'This reply request differs from an existing reply. Refresh its history before continuing.':'The reply could not be recorded.'},prepareError?.code==='22023'?409:503);
  if(['accepted','sent','delivered','bounced','complained','suppressed'].includes(prepared.status))return reply({success:true,recorded:true,accepted:['accepted','sent','delivered'].includes(prepared.status),delivered:prepared.status==='delivered',status:prepared.status,reply_id:prepared.reply_id});
  if(prepared.duplicate&&(!Number.isFinite(Date.parse(prepared.created_at))||Date.now()-Date.parse(prepared.created_at)>23*60*60*1000))return reply({success:true,recorded:true,accepted:false,delivered:false,status:'review_required',reply_id:prepared.reply_id});
  const {data:delivery,error:deliveryError}=await admin.functions.invoke('process-transactional-email-queue',{body:{queueId:prepared.queue_id},headers:{'x-transactional-email-processor-secret':secret}});
  return reply({success:true,recorded:true,accepted:!deliveryError&&delivery?.accepted===true,delivered:false,status:!deliveryError&&delivery?.accepted===true?'accepted':'pending_confirmation',reply_id:prepared.reply_id});
 }catch{return reply({error:'Support operation could not be confirmed. Refresh the recorded history before retrying.'},503);}
});
