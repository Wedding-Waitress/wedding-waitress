import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { isOwnerAdminEmail } from '../_shared/owner-admin.ts';

const headers = { 'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,x-client-info,apikey,content-type','Access-Control-Allow-Methods':'POST, OPTIONS' };
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const allowedKeys=new Set(['customer_id','event_id','kind','record_id','admin_grant','admin_grant_signature']);
const safePath=(path:unknown,prefix:string):path is string=>typeof path==='string'&&path.startsWith(prefix)&&path.length>prefix.length&&path.split('/').every(part=>!!part&&part!=='.'&&part!=='..'&&/^[A-Za-z0-9._-]+$/.test(part));

/** Read-only support assets. Paths and buckets are derived from owned records,
 * never supplied by a caller; no customer session or share token is minted. */
Deno.serve(async(req)=>{
 if(req.method==='OPTIONS')return new Response(null,{headers});
 if(req.method!=='POST')return reply({error:'Method not allowed'},405);
 try {
  const authorization=req.headers.get('Authorization');
  if(!authorization?.startsWith('Bearer '))return reply({error:'Administrator authentication required'},401);
  const url=Deno.env.get('SUPABASE_URL')!,anon=Deno.env.get('SUPABASE_ANON_KEY')!,key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  if(!url||!anon||!key)return reply({error:'Read-only media access is unavailable'},503);
  const caller=createClient(url,anon,{global:{headers:{Authorization:authorization}},auth:{persistSession:false}});
  const {data:identity,error:identityError}=await caller.auth.getUser(authorization.slice(7));
  if(identityError||!identity.user||identity.user.is_anonymous||!isOwnerAdminEmail(identity.user.email))return reply({error:'Administrator access denied'},403);
  const actor=identity.user.id;
  const {data:owner,error:ownerError}=await caller.rpc('is_owner_admin');
  if(ownerError||owner!==true)return reply({error:'Administrator access denied'},403);
  const body=await req.json();
  if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(k=>!allowedKeys.has(k)))return reply({error:'Invalid read-only media request'},400);
  const target=body.customer_id,eventId=body.event_id,kind=body.kind,recordId=body.record_id;
  if(typeof target!=='string'||!uuid.test(target)||!['event_image','live_view_invitation','live_view_welcome','live_view_reception','live_view_menu','live_view_hero','reception_background','questionnaire_audio','invitation_background','signage_background','place_card_background','qr_logo','profile_image','booth_strip_logo','booth_strip_template','gallery_cover','gallery_logo','gallery_background','event_media'].includes(kind)
   ||kind!=='profile_image'&&(typeof eventId!=='string'||!uuid.test(eventId)))return reply({error:'Invalid read-only media request'},400);
  if(kind!=='reception_background'&&(typeof recordId!=='string'||!uuid.test(recordId)))return reply({error:'Invalid media record request'},400);
  if(kind==='profile_image'&&recordId!==target)return reply({error:'Invalid account artwork request'},400);
  if(kind==='event_image'&&recordId!==eventId)return reply({error:'Invalid event artwork request'},400);
  const grant=body.admin_grant,signature=body.admin_grant_signature;
  if(typeof grant!=='string'||typeof signature!=='string'||!grant||!signature)return reply({error:'Recent administrator verification required'},403);
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(`${grant}|${key}`));
  const expected=Array.from(new Uint8Array(digest)).map(byte=>byte.toString(16).padStart(2,'0')).join('');
  if(signature!==expected)return reply({error:'Recent administrator verification required'},403);
  let verified:{user_id?:unknown;exp?:unknown};
  try {verified=JSON.parse(atob(grant));}catch{return reply({error:'Invalid administrator verification'},403);}
  if(verified.user_id!==actor||typeof verified.exp!=='number'||!Number.isFinite(verified.exp)||verified.exp<=Date.now())return reply({error:'Administrator verification expired'},403);
  const admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  if(kind!=='profile_image'){
   const {data:event,error:eventError}=await admin.from('events').select('id,user_id').eq('id',eventId).eq('user_id',target).maybeSingle();
   if(eventError)throw eventError;
   if(!event)return reply({error:'Customer media is unavailable'},404);
  }
  let path:unknown,bucket:string,prefix:string;
  if(kind==='profile_image'){
   const {data:profile,error}=await admin.from('profiles').select('profile_image_path').eq('id',target).maybeSingle();
   if(error)throw error;
   if(!profile)return reply({error:'Customer account artwork is unavailable'},404);
   path=profile.profile_image_path;bucket='profile-images';prefix=`${target}/`;
   if(path!==`${target}/profile-image`)return reply({error:'The saved account artwork cannot be verified'},409);
  }else if(kind==='event_image'){
   const {data:event,error}=await admin.from('events').select('event_image_path').eq('id',eventId).eq('user_id',target).maybeSingle();
   if(error)throw error;
   if(!event)return reply({error:'Saved event artwork is unavailable'},404);
   path=event.event_image_path;bucket='event-branding';prefix=`${target}/`;
   // A completed onboarding draft may remain the actual saved event reference.
   // It is allowed only when this exact owned event points to that object.
   const file='[0-9a-f-]{36}\\.(png|jpe?g|webp)';
   if(typeof path!=='string'||!new RegExp(`^${prefix}(?:events/${eventId}|drafts/[0-9a-f-]{36})/${file}$`,'i').test(path))return reply({error:'The saved event artwork scope cannot be verified'},409);
  }else if(kind.startsWith('live_view_')){
   const purposes:Record<string,{field:string;folder:string;bucket:string;extensions:string}>={
    live_view_invitation:{field:'rsvp_invite_config',folder:'rsvp_invite',bucket:'invitations',extensions:'pdf|png|jpe?g'},
    live_view_welcome:{field:'welcome_video_config',folder:'welcome_video',bucket:'live-view-uploads',extensions:'mp4|mov|webm'},
    live_view_reception:{field:'reception_floor_plan_config',folder:'reception_floor_plan',bucket:'live-view-uploads',extensions:'png|jpe?g'},
    live_view_menu:{field:'menu_config',folder:'menu',bucket:'live-view-uploads',extensions:'pdf|png|jpe?g'},
    live_view_hero:{field:'hero_image_config',folder:'hero_image',bucket:'live-view-uploads',extensions:'png|jpe?g|webp'},
   },purpose=purposes[kind];
   const {data:settings,error}=await admin.from('live_view_module_settings').select(purpose.field).eq('id',recordId).eq('event_id',eventId).maybeSingle();
   if(error)throw error;
   if(!settings)return reply({error:'Saved guest app settings are unavailable'},404);
   const config=(settings as unknown as Record<string,{video_url?:unknown;file_url?:unknown}>)[purpose.field],nonEmpty=(value:unknown)=>typeof value==='string'&&value.trim()?value:null;
   const savedUrl=kind==='live_view_welcome'?nonEmpty(config?.video_url)??nonEmpty(config?.file_url):config?.file_url;
   const saved=typeof savedUrl==='string'?new URL(savedUrl):null,publicPrefix=`/storage/v1/object/public/${purpose.bucket}/`;
   if(!saved||saved.origin!==new URL(url).origin||!saved.pathname.startsWith(publicPrefix)||saved.search||saved.hash)return reply({error:'The saved guest app asset reference cannot be verified'},409);
   bucket=purpose.bucket;prefix=`${target}/${eventId}/${purpose.folder}/`;path=saved.pathname.slice(publicPrefix.length);
   const filename=kind==='live_view_hero'?'(?:[0-9]+|event-[0-9a-f-]{36})':'[0-9]+';
   if(typeof path!=='string'||!new RegExp(`^${prefix}${filename}\\.(${purpose.extensions})$`,'i').test(path))return reply({error:'The saved guest app upload purpose cannot be verified'},409);
  }else if(kind==='reception_background'){
   const {data:plan,error}=await admin.from('reception_floor_plans').select('background_image_url').eq('event_id',eventId).eq('user_id',target).maybeSingle();
   if(error)throw error;
   path=plan?.background_image_url;bucket='reception-floor-plan-backgrounds';prefix=`${target}/${eventId}/`;
  }else if(kind==='booth_strip_logo'||kind==='booth_strip_template'){
   const field=kind==='booth_strip_logo'?'photo_booth_strip_logo_url':'photo_booth_strip_template_url';
   const {data:gallery,error}=await admin.from('event_media_galleries').select(field)
    .eq('id',recordId).eq('event_id',eventId).eq('user_id',target).maybeSingle();
   if(error)throw error;
   if(!gallery)return reply({error:'Customer Photo Booth artwork is unavailable'},404);
   const savedUrl=(gallery as Record<string,unknown>)[field];
   const saved=typeof savedUrl==='string'?new URL(savedUrl):null;
   const publicPrefix='/storage/v1/object/public/event-media-branding/';
   if(!saved||saved.origin!==new URL(url).origin||!saved.pathname.startsWith(publicPrefix)||saved.search||saved.hash)
    return reply({error:'The saved media reference cannot be verified'},409);
   const purpose=kind==='booth_strip_logo'?'logo':'template';
   path=saved.pathname.slice(publicPrefix.length);bucket='event-media-branding';prefix=`${target}/${eventId}/`;
   if(typeof path!=='string'||!new RegExp(`^${prefix}photobooth-strip-${purpose}-[0-9]+\\.jpe?g$`).test(path))
    return reply({error:'The saved Photo Booth purpose cannot be verified'},409);
  }else if(['gallery_cover','gallery_logo','gallery_background'].includes(kind)){
   const purpose=kind.slice('gallery_'.length),field=purpose==='cover'?'cover_image_url':purpose==='logo'?'logo_image_url':'background_image_url';
   const {data:gallery,error}=await admin.from('event_media_galleries').select(field).eq('id',recordId).eq('event_id',eventId).eq('user_id',target).maybeSingle();
   if(error)throw error;
   if(!gallery)return reply({error:'Customer gallery artwork is unavailable'},404);
   const savedUrl=(gallery as Record<string,unknown>)[field];
   const saved=typeof savedUrl==='string'?new URL(savedUrl):null,publicPrefix='/storage/v1/object/public/event-media-branding/';
   if(!saved||saved.origin!==new URL(url).origin||!saved.pathname.startsWith(publicPrefix)||saved.search||saved.hash)return reply({error:'The saved gallery artwork reference cannot be verified'},409);
   path=saved.pathname.slice(publicPrefix.length);bucket='event-media-branding';prefix=`${target}/${eventId}/`;
   if(typeof path!=='string'||!new RegExp(`^${prefix}${purpose}-[0-9]+\\.(png|jpe?g|webp)$`,'i').test(path))return reply({error:'The saved gallery artwork purpose cannot be verified'},409);
  }else if(kind==='event_media'){
   const {data:gallery,error:galleryError}=await admin.from('event_media_galleries').select('id').eq('event_id',eventId).eq('user_id',target).maybeSingle();
   if(galleryError)throw galleryError;
   if(!gallery)return reply({error:'Customer gallery is unavailable'},404);
   const {data:item,error}=await admin.from('event_media_items').select('storage_path')
    .eq('id',recordId).eq('event_id',eventId).eq('gallery_id',gallery.id).eq('upload_status','uploaded').maybeSingle();
   if(error)throw error;
   if(!item)return reply({error:'Customer media is unavailable'},404);
   path=item.storage_path;bucket='event-media';prefix=`${eventId}/`;
   if(typeof path!=='string'||!path.startsWith(`${eventId}/${recordId}.`))return reply({error:'The saved media reference cannot be verified'},409);
  }else if(kind==='qr_logo'){
   const {data:design,error}=await admin.from('qr_code_settings').select('center_image_url')
    .eq('id',recordId).eq('event_id',eventId).eq('user_id',target).maybeSingle();
   if(error)throw error;
   if(!design)return reply({error:'Customer QR artwork is unavailable'},404);
   const saved=typeof design.center_image_url==='string'?new URL(design.center_image_url):null;
   const publicPrefix='/storage/v1/object/public/qr-assets/';
   if(!saved||saved.origin!==new URL(url).origin||!saved.pathname.startsWith(publicPrefix)||saved.search||saved.hash)
    return reply({error:'The saved media reference cannot be verified'},409);
   path=saved.pathname.slice(publicPrefix.length);bucket='qr-assets';prefix=`${target}/${eventId}/qr-logo/`;
  }else if(kind==='place_card_background'){
   const {data:design,error}=await admin.from('place_card_settings').select('background_image_url')
    .eq('id',recordId).eq('event_id',eventId).eq('user_id',target).maybeSingle();
   if(error)throw error;
   if(!design)return reply({error:'Customer Place Card artwork is unavailable'},404);
   const saved=typeof design.background_image_url==='string'?new URL(design.background_image_url):null;
   if(!saved||saved.origin!==new URL(url).origin||saved.search||saved.hash)return reply({error:'The saved Place Card reference cannot be verified'},409);
   const ownerPrefix='/storage/v1/object/public/qr-assets/';
   const galleryPrefix='/storage/v1/object/public/place-card-gallery/';
   if(saved.pathname.startsWith(ownerPrefix)){
    path=saved.pathname.slice(ownerPrefix.length);bucket='qr-assets';prefix=`${target}/place-cards/`;
    if(typeof path!=='string'||!new RegExp(`^${prefix}place-card-bg-[0-9]+\\.(png|jpe?g|webp|gif|avif)$`,'i').test(path))return reply({error:'The saved Place Card upload purpose cannot be verified'},409);
   }else if(saved.pathname.startsWith(galleryPrefix)){
    const {data:catalogue,error:catalogueError}=await admin.from('place_card_gallery_images').select('id').eq('image_url',design.background_image_url).maybeSingle();
    if(catalogueError)throw catalogueError;
    if(!catalogue)return reply({error:'The selected Place Card catalogue artwork is unavailable'},404);
    path=saved.pathname.slice(galleryPrefix.length);bucket='place-card-gallery';prefix='';
   }else return reply({error:'The saved Place Card artwork purpose cannot be verified'},409);
  }else if(kind==='signage_background'){
   const {data:artwork,error}=await admin.from('signage_settings').select('background_image_url,background_image_print_url')
    .eq('id',recordId).eq('event_id',eventId).eq('user_id',target).maybeSingle();
   if(error)throw error;
   if(!artwork)return reply({error:'Customer artwork is unavailable'},404);
   const savedUrl=artwork.background_image_print_url||artwork.background_image_url;
   const saved=typeof savedUrl==='string'?new URL(savedUrl):null;
   const publicPrefix='/storage/v1/object/public/invitations/';
   if(!saved||saved.origin!==new URL(url).origin||!saved.pathname.startsWith(publicPrefix)||saved.search||saved.hash)
    return reply({error:'The saved media reference cannot be verified'},409);
   path=saved.pathname.slice(publicPrefix.length);bucket='invitations';prefix=`${target}/signage/`;
  }else if(kind==='invitation_background'){
   const {data:artwork,error}=await admin.from('invitation_card_settings').select('background_image_url')
    .eq('id',recordId).eq('event_id',eventId).eq('user_id',target).maybeSingle();
   if(error)throw error;
   if(!artwork)return reply({error:'Customer artwork is unavailable'},404);
   const saved=typeof artwork.background_image_url==='string'?new URL(artwork.background_image_url):null;
   const publicPrefix='/storage/v1/object/public/invitations/';
   if(!saved||saved.origin!==new URL(url).origin||!saved.pathname.startsWith(publicPrefix)||saved.search||saved.hash)
    return reply({error:'The saved media reference cannot be verified'},409);
   path=saved.pathname.slice(publicPrefix.length);bucket='invitations';prefix=`${target}/invitations/`;
  }else{
   const {data:item,error:itemError}=await admin.from('dj_mc_items').select('section_id,pronunciation_audio_path,pronunciation_audio_url').eq('id',recordId).maybeSingle();
   if(itemError)throw itemError;
   if(!item)return reply({error:'Customer recording is unavailable'},404);
   const {data:section,error:sectionError}=await admin.from('dj_mc_sections').select('questionnaire_id').eq('id',item.section_id).maybeSingle();
   if(sectionError)throw sectionError;
   if(!section)return reply({error:'Customer recording is unavailable'},404);
   const {data:questionnaire,error}=await admin.from('dj_mc_questionnaires').select('id').eq('id',section.questionnaire_id).eq('event_id',eventId).eq('user_id',target).maybeSingle();
   if(error)throw error;
   if(!questionnaire)return reply({error:'Customer recording is unavailable'},404);
   path=item.pronunciation_audio_path;bucket='djmc-pronunciations';prefix=`${target}/${eventId}/${recordId}/`;
   if(!path&&typeof item.pronunciation_audio_url==='string'){
    const legacy=new URL(item.pronunciation_audio_url);
    const legacyPrefix='/storage/v1/object/public/venue-logos/';
    if(legacy.origin!==new URL(url).origin||!legacy.pathname.startsWith(`${legacyPrefix}pronunciations/`)||legacy.search||legacy.hash)return reply({error:'The saved media reference cannot be verified'},409);
    path=legacy.pathname.slice(legacyPrefix.length);bucket='venue-logos';prefix='pronunciations/';
   }
  }
  if(!safePath(path,prefix))return reply({error:'The saved media reference cannot be verified'},409);
  const {data:signed,error:signError}=await admin.storage.from(bucket).createSignedUrl(path,600);
  if(signError||!signed?.signedUrl)throw signError||new Error('Media unavailable');
  const {error:auditError}=await admin.from('admin_action_audit').insert({administrator_id:actor,action:'view_customer_media',target_type:'account',target_id:target,reason:'Read-only owner support media preview',previous_state:{},new_state:{event_id:kind==='profile_image'?null:eventId,kind,read_only:true},result:'succeeded'});
  if(auditError)throw auditError;
  return reply({read_only:true,url:signed.signedUrl,expires_at:new Date(Date.now()+600000).toISOString()});
 }catch{return reply({error:'Read-only media access could not be verified'},503);}
});
