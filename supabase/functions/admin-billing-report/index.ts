import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { isOwnerAdminEmail } from '../_shared/owner-admin.ts';
import { hasRecentAdminVerification } from '../_shared/adminVerifiedSession.ts';
import { BILLING_RESOURCES, readLiveBillingPage, type BillingResource } from '../_shared/adminLiveBilling.ts';

const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,x-client-info,apikey,content-type','Content-Type':'application/json','Cache-Control':'no-store'};
const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers});
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const allowed=new Set(['resource','cursor','admin_grant','admin_grant_signature']);
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
  if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(name=>!allowed.has(name)))return reply({error:'Invalid billing report request.'},400);
  const grant=body.admin_grant,signature=body.admin_grant_signature;
  if(typeof grant!=='string'||typeof signature!=='string'||!grant||!signature)return reply({error:'Administrator verification required.'},403);
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(grant+'|'+service));
  const expected=Array.from(new Uint8Array(digest)).map(byte=>byte.toString(16).padStart(2,'0')).join('');
  if(signature.length!==expected.length||[...expected].reduce((n,c,i)=>n|(c.charCodeAt(0)^signature.charCodeAt(i)),0)!==0)return reply({error:'Administrator verification required.'},403);
  let decoded:{user_id?:string;session_id?:string;exp?:number};try{decoded=JSON.parse(atob(grant));}catch{return reply({error:'Administrator verification required.'},403);}
  if(decoded.user_id!==claims.sub||decoded.session_id!==claims.session_id||typeof decoded.exp!=='number'||!Number.isFinite(decoded.exp)||decoded.exp<=Date.now())return reply({error:'Administrator verification expired.'},403);
  const resource=body.resource;
  if(typeof resource!=='string'||!Object.prototype.hasOwnProperty.call(BILLING_RESOURCES,resource)||body.cursor!==undefined&&(typeof body.cursor!=='string'||!BILLING_RESOURCES[resource as BillingResource].id.test(body.cursor)))return reply({error:'Invalid billing resource or cursor.'},400);
  const key=Deno.env.get('STRIPE_READ_ONLY_KEY');
  if(!key||!/^rk_live_[A-Za-z0-9_]+$/.test(key))return reply({state:'not_configured',read_only:true,error:'Dedicated live read-only Stripe reporting credentials are missing. No live totals have been inferred.'});
  const admin=createClient(url,service,{auth:{persistSession:false}});
  const {error:auditError}=await admin.from('admin_action_audit').insert({administrator_id:claims.sub,action:'authorize_live_billing_read',target_type:'billing_report',target_id:claims.sub,reason:'Owner requested read-only '+resource+' reporting',previous_state:{},new_state:{resource,read_only:true},result:'succeeded'});
  if(auditError)return reply({error:'Billing access could not be audited. No provider data was read.'},503);
  try{return reply(await readLiveBillingPage(key,resource as BillingResource,body.cursor));}
  catch{return reply({state:'unavailable',error:'Live billing could not be checked. Verify the dedicated reporting key and its read permissions; no empty result has been inferred.'},503);}
 }catch{return reply({error:'Billing access could not be confirmed.'},503);}
});
