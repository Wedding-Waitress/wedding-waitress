import { createClient } from 'npm:@supabase/supabase-js@2';

const BUCKET='djmc-pronunciations';
const LEGACY_BUCKET='venue-logos';
const MAX_BYTES=5*1024*1024;
const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LEGACY_URL_RE=/^https:\/\/[^/]+\/storage\/v1\/object\/public\/venue-logos\/(pronunciations\/[A-Za-z0-9._-]+)$/;
const ALLOWED_TYPES=new Set(['audio/webm','audio/ogg','audio/mp4','audio/x-m4a']);
const LIMITS={sign:60,upload:10,delete:20} as const;
const corsHeaders={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...corsHeaders,'Content-Type':'application/json'}});
const extensionFor=(type:string)=>type==='audio/ogg'?'ogg':(type==='audio/mp4'||type==='audio/x-m4a')?'m4a':'webm';
const sha256=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(v=>v.toString(16).padStart(2,'0')).join('');

Deno.serve(async(req)=>{
  if(req.method==='OPTIONS') return new Response('ok',{headers:corsHeaders});
  if(req.method!=='POST') return json({error:'Method not allowed'},405);
  try{
    const form=await req.formData();
    const action=String(form.get('action')||'') as keyof typeof LIMITS;
    const eventId=String(form.get('eventId')||'');
    const itemId=String(form.get('itemId')||'');
    const shareToken=String(form.get('shareToken')||'');
    const requestedPath=String(form.get('path')||'');
    if(!(action in LIMITS)||!UUID_RE.test(eventId)||!UUID_RE.test(itemId)) return json({error:'Invalid request'},400);

    const url=Deno.env.get('SUPABASE_URL')!;
    const admin=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
    const {data:item}=await admin.from('dj_mc_items').select('id,section_id,pronunciation_audio_url,pronunciation_audio_path').eq('id',itemId).maybeSingle();
    if(!item) return json({error:'Recording item not found'},404);
    const {data:section}=await admin.from('dj_mc_sections').select('questionnaire_id').eq('id',item.section_id).maybeSingle();
    if(!section) return json({error:'Recording item not found'},404);
    const {data:questionnaire}=await admin.from('dj_mc_questionnaires').select('id,event_id,user_id').eq('id',section.questionnaire_id).eq('event_id',eventId).maybeSingle();
    if(!questionnaire) return json({error:'Recording item not found'},404);

    let callerId:string|null=null;
    const authHeader=req.headers.get('Authorization')||'';
    if(authHeader.toLowerCase().startsWith('bearer ')){
      const caller=createClient(url,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:authHeader}},auth:{persistSession:false,autoRefreshToken:false}});
      const {data}=await caller.auth.getUser(); callerId=data.user?.id||null;
    }
    // DJ/MC questionnaire rows are owner-only under their existing RLS model.
    // A signed-in team member does not gain storage access implicitly; they must
    // use an explicit live share token just like any other DJ/MC collaborator.
    const hasOwnerAccess=callerId===questionnaire.user_id;

    let sharePermission:'view_only'|'can_edit'|null=null;
    if(!hasOwnerAccess&&shareToken){
      const {data:tokenRow}=await admin.from('dj_mc_share_tokens').select('permission,expires_at').eq('questionnaire_id',questionnaire.id).eq('token',shareToken).maybeSingle();
      if(tokenRow&&(!tokenRow.expires_at||new Date(tokenRow.expires_at).getTime()>Date.now())) sharePermission=tokenRow.permission==='can_edit'?'can_edit':'view_only';
    }
    if(!hasOwnerAccess&&!sharePermission) return json({error:'Not authorised'},403);
    if(action!=='sign'&&!hasOwnerAccess&&sharePermission!=='can_edit') return json({error:'Edit permission required'},403);

    if(!hasOwnerAccess){
      const keyHash=await sha256(`djmc-pronunciation:${shareToken}`);
      const {data:allowed,error:limitError}=await admin.rpc('consume_djmc_pronunciation_rate_limit',{p_key_hash:keyHash,p_action:action,p_limit:LIMITS[action],p_window_seconds:60});
      if(limitError) return json({error:'Could not verify request limit'},503);
      if(!allowed) return json({error:'Too many recording requests. Please wait and try again.'},429);
    }

    const expectedPrefix=`${questionnaire.user_id}/${eventId}/${itemId}/`;
    const legacyMatch=requestedPath.match(LEGACY_URL_RE);
    const isLegacy=!!legacyMatch;
    if(action==='sign'){
      if(!requestedPath.startsWith(expectedPrefix)||item.pronunciation_audio_path!==requestedPath) return json({error:'Recording is no longer attached to this item'},409);
      const {data,error}=await admin.storage.from(BUCKET).createSignedUrl(requestedPath,15*60);
      return error||!data?.signedUrl?json({error:'Could not create recording link'},500):json({signedUrl:data.signedUrl});
    }

    if(action==='delete'){
      if(isLegacy&&!hasOwnerAccess) return json({error:'Legacy recordings require organiser access'},403);
      const column=isLegacy?'pronunciation_audio_url':'pronunciation_audio_path';
      if((!isLegacy&&!requestedPath.startsWith(expectedPrefix))||item[column]!==requestedPath) return json({error:'Recording is no longer attached to this item'},409);
      const {data:cleared,error:clearError}=await admin.from('dj_mc_items').update({[column]:null}).eq('id',itemId).eq(column,requestedPath).select('id').maybeSingle();
      if(clearError||!cleared) return json({error:'Recording changed before it could be removed'},409);
      const bucket=isLegacy?LEGACY_BUCKET:BUCKET;
      const objectPath=isLegacy?legacyMatch![1]:requestedPath;
      const {error:removeError}=await admin.storage.from(bucket).remove([objectPath]);
      if(removeError){
        await admin.from('dj_mc_items').update({[column]:requestedPath}).eq('id',itemId).is(column,null);
        return json({error:'Could not remove recording'},500);
      }
      return json({deleted:true});
    }

    const file=form.get('file');
    if(!(file instanceof File)) return json({error:'Recording file required'},400);
    if(file.size<1||file.size>MAX_BYTES) return json({error:'Recording must be 5 MB or smaller'},413);
    if(!ALLOWED_TYPES.has(file.type)) return json({error:'Unsupported recording type'},415);
    if(item.pronunciation_audio_path) return json({error:'Delete the existing recording before replacing it'},409);
    const path=`${expectedPrefix}${crypto.randomUUID()}.${extensionFor(file.type)}`;
    const {error:uploadError}=await admin.storage.from(BUCKET).upload(path,file,{contentType:file.type,cacheControl:'3600',upsert:false});
    if(uploadError) return json({error:'Could not save recording'},500);
    const {data:attached,error:attachError}=await admin.from('dj_mc_items').update({pronunciation_audio_path:path}).eq('id',itemId).is('pronunciation_audio_path',null).select('id').maybeSingle();
    if(attachError||!attached){
      await admin.storage.from(BUCKET).remove([path]);
      return json({error:'Could not attach recording to the questionnaire'},409);
    }
    return json({path});
  }catch(error){console.error('djmc-pronunciation-media error',error);return json({error:'Unexpected recording error'},500);}
});
