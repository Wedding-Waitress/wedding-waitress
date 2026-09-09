
import {createClient} from 'npm:@supabase/supabase-js@2';
import {requireEditor,sanitizeDraft} from './policy.ts';
import {contribute} from './contribution.ts';
const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, x-client-info, content-type','Content-Type':'application/json'};
Deno.serve(async req=>{
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
  const {data:plan,error:pe}=await db.from(link.kind==='ceremony'?'ceremony_floor_plans':'reception_floor_plans').select('*').eq('event_id',link.event_id).eq('user_id',link.user_id).single();
  if(pe||!plan)return reply({error:'Floor plan unavailable'},404);
  const {data:event}=await db.from('events').select('name,date,venue,partner1_name,partner2_name,start_time,finish_time,ceremony_date,ceremony_venue,ceremony_start_time,ceremony_finish_time').eq('id',link.event_id).single();
  if(!event)return reply({error:'Event unavailable'},404);
  if(action==='info')return reply({venue_name:event.venue??'',room_name:'',venue_email:''});
  if(action==='upload'||action==='trial')return reply(await contribute(db,link,b));
  let tables:any[]=[],backgroundUrl=null,draft=null;
  if(link.kind==='reception'){
   const {data:rows,error:te}=await db.from('tables').select('id,name,table_no,limit_seats,table_type,table_purpose,head_seating_order').eq('event_id',link.event_id);
   const {data:guests,error:ge}=await db.from('guests').select('table_id,seat_no').eq('event_id',link.event_id);
   if(te||ge)throw Error('Could not load tables');
   tables=(rows??[]).map(t=>({...t,guest_count:(guests??[]).filter(g=>g.table_id===t.id).length,occupied_seat_numbers:(guests??[]).filter(g=>g.table_id===t.id&&g.seat_no!=null).map(g=>g.seat_no)}));
   if(action==='save'||action==='submit'){
    if(!Number.isInteger(b.revision)||b.revision<0)return reply({error:'Invalid revision'},400);
    const payload=sanitizeDraft(b.plan,plan,tables);
    const {data:result,error:saveError}=await db.rpc('save_reception_collaborator_draft',{_token:token,_payload:payload,_revision:b.revision,_submit:action==='submit',_base:b.baseUpdatedAt});
    if(saveError)return reply({error:saveError.message},409);
    return reply({...result,payload});
   }
   if(plan.background_image_url){const {data:url}=await db.storage.from('reception-floor-plan-backgrounds').createSignedUrl(plan.background_image_url,3600);backgroundUrl=url?.signedUrl??null;}
   if(link.permission==='can_edit'){const {data,error}=await db.from('reception_collaborator_drafts').select('payload,revision,status,base_updated_at').eq('link_id',link.id).maybeSingle();if(error)throw error;draft=data;}
  }
  await db.from('floor_plan_share_tokens').update({last_accessed_at:new Date().toISOString()}).eq('id',link.id);
  delete plan.user_id;delete plan.share_token;
  return reply({plan,event,tables,backgroundUrl,draft,kind:link.kind,permission:link.permission});
 }catch(e){console.error('floor plan share',e);return reply({error:e instanceof Error?e.message:'Unable to complete this request.'},400);}
});
