import { guardSuspendedCustomer } from '../_shared/suspension-guard.ts';

import {createClient} from 'npm:@supabase/supabase-js@2';
import {requireEditor,sanitizeDraft} from './policy.ts';
import {loadFloorPlanAndEvent,loadReceptionShareContent} from './load.ts';
import {contribute} from './contribution.ts';
const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, x-client-info, content-type','Content-Type':'application/json'};
Deno.serve(async req=>{
  const suspensionResponse = await guardSuspendedCustomer(req);
  if (suspensionResponse) return suspensionResponse;
 const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{headers,status});
 if(req.method==='OPTIONS')return new Response(null,{headers});
 try{
  if(req.method!=='POST')return reply({error:'Method not allowed'},405);
  const form=req.headers.get('content-type')?.includes('multipart/form-data')?await req.formData():null;
  const b=form?Object.fromEntries(form):await req.json(),{token}=b,action=b.action??'get';
  if(typeof token!=='string'||! /^[a-f0-9]{64}$/.test(token))return reply({error:'Invalid link'},403);
  const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const {data:link,error}=await db.from('floor_plan_share_tokens').select('*').eq('token',token).gt('expires_at',new Date().toISOString()).maybeSingle();
  if(error||!link)return reply({error:'This link has expired or been revoked.'},403);
  if(!['get','save','submit','info','upload','trial'].includes(action))return reply({error:'Invalid action'},400);
  try{requireEditor(link,action);}catch(e){return reply({error:(e as Error).message},403);}
  const result=await loadFloorPlanAndEvent(db,link);
  const plan=result.plan.data,event=result.event.data;
  if(result.plan.error||!plan)return reply({error:'Floor plan unavailable'},404);
  if(result.event.error||!event)return reply({error:'Event unavailable'},404);
  if(action==='info')return reply({venue_name:event.venue??'',room_name:'',venue_email:''});
  if(action==='upload'||action==='trial')return reply(await contribute(db,link,b));
  let tables:any[]=[],backgroundUrl=null,draft=null;
  if(link.kind==='reception'){
   const content=await loadReceptionShareContent(db,link,plan,action!=='save'&&action!=='submit');
   tables=content.tables;backgroundUrl=content.backgroundUrl;draft=content.draft;
   if(action==='save'||action==='submit'){
    if(!Number.isInteger(b.revision)||b.revision<0)return reply({error:'Invalid revision'},400);
    const payload=sanitizeDraft(b.plan,plan,tables);
    const {data:result,error:saveError}=await db.rpc('save_reception_collaborator_draft',{_token:token,_payload:payload,_revision:b.revision,_submit:action==='submit',_base:b.baseUpdatedAt});
    if(saveError)return reply({error:saveError.message},409);
    return reply({...result,payload});
   }
  }
  await db.from('floor_plan_share_tokens').update({last_accessed_at:new Date().toISOString()}).eq('id',link.id);
  delete plan.user_id;delete plan.share_token;
  return reply({plan,event,tables,backgroundUrl,draft,kind:link.kind,permission:link.permission});
 }catch(e){console.error('floor plan share',e);return reply({error:e instanceof Error?e.message:'Unable to complete this request.'},400);}
});
