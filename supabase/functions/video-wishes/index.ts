import {createClient} from 'npm:@supabase/supabase-js@2';
import {resolveVideoWishesContext,resolveWishSender} from '../_shared/video-wishes-context.ts';
import {validateProcessedWish,validateStoredWish} from '../_shared/video-wishes-validation.ts';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,x-client-info,apikey,content-type','Access-Control-Allow-Methods':'POST,OPTIONS'};
const respond=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});
const hash=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(b=>b.toString(16).padStart(2,'0')).join('');
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
async function cf(path:string,method='GET',body?:unknown) {
 const account=Deno.env.get('CLOUDFLARE_ACCOUNT_ID'),token=Deno.env.get('CLOUDFLARE_STREAM_API_TOKEN');
 if(!account||!token) throw new Error('PROCESSOR_UNAVAILABLE');
 const response=await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/stream${path}`,{method,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
 if(method==='DELETE'&&(response.ok||response.status===404))return null;
 const data=await response.json();
 if(!response.ok||!data.success)throw new Error('PROCESSOR_UNAVAILABLE_'+response.status+'_'+String(data.errors?.[0]?.code||'unknown')); 
 return data.result;
}
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(req.method!=='POST')return respond({error:'METHOD_NOT_ALLOWED'},405);
 try {
  const body=await req.json();
  const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const context=await resolveVideoWishesContext(db,String(body.slug||''),typeof body.invite==='string'?body.invite:undefined,String(body.password||''));
  if(body.action==='context')return respond({event:{id:context.event.id,name:context.event.name,date:context.event.date},maxBytes:context.maxBytes,maxSeconds:context.maxSeconds,
   mainGuestId:context.recipient?.id||null,hasFamily:!!context.recipient?.family_group&&context.members.length>1,
   members:context.members.map(g=>({id:g.id,name:[g.first_name,g.last_name].filter(Boolean).join(' ')}))});
  if(!uuid.test(body.requestId)||typeof body.secret!=='string'||body.secret.length<32||body.secret.length>128)throw new Error('INVALID_REQUEST');
  const secretHash=await hash(body.secret);
  if(body.action==='reserve') {
   const sender=resolveWishSender(context,body.sender,body.name);
   if(!Number.isSafeInteger(body.bytes)||body.bytes<=0||body.bytes>context.maxBytes)throw new Error('VIDEO_TOO_LARGE');
   const {data:item,error}=await db.rpc('reserve_video_wish',{_event_id:context.event.id,_request_id:body.requestId,_secret_hash:secretHash,_mime:body.mime,_bytes:body.bytes,_sender:sender});
   if(error||!item)throw new Error('UPLOAD_UNAVAILABLE');
   if(item.upload_status==='pending'&&Date.parse(item.upload_token_expires_at)<Date.now())throw new Error('UPLOAD_EXPIRED');
   const {data:existingFile}=await db.storage.from('event-media').createSignedUrl(item.storage_path,30);
   return respond({id:item.id,path:item.storage_path,status:item.upload_status,filePresent:!!existingFile?.signedUrl});
  }
  const {data:job,error:jobError}=await db.from('video_wishes_uploads').select('*').eq('request_id',body.requestId).eq('secret_hash',secretHash).eq('event_id',context.event.id).maybeSingle();
  if(jobError||!job)throw new Error('INVALID_REQUEST');
  const {data:item,error:itemError}=await db.from('event_media_items').select('*').eq('id',job.item_id).single();
  if(itemError||!item)throw new Error('INVALID_REQUEST');
  if(item.upload_status==='uploaded')return respond({status:'uploaded'});
  if(item.upload_status!=='pending'||Date.parse(item.upload_token_expires_at)<Date.now())throw new Error('UPLOAD_EXPIRED');
  if(body.action!=='verify')throw new Error('INVALID_REQUEST');
  let processorId=job.processor_id;
  if(!processorId) {
   // Claim the processor start atomically. Concurrent retries cannot create duplicate jobs.
   const {data:claim,error:claimError}=await db.from('video_wishes_uploads').update({processing_started_at:new Date().toISOString()}).eq('item_id',item.id).is('processing_started_at',null).select('item_id');
   if(claimError)throw new Error('UPLOAD_UNAVAILABLE');
   if(!claim?.length)return respond({status:'processing'});
   try {
    const {data:sign,error:signError}=await db.storage.from('event-media').createSignedUrl(item.storage_path,900);
    if(signError||!sign)throw new Error('UPLOAD_INCOMPLETE');
    const head=await fetch(sign.signedUrl,{method:'HEAD'});
    if(!head.ok)throw new Error('UPLOAD_INCOMPLETE');
    const prefixResponse=await fetch(sign.signedUrl,{headers:{Range:'bytes=0-31'}});
    if(prefixResponse.status!==206){await prefixResponse.body?.cancel();throw new Error('UPLOAD_INCOMPLETE');}
    validateStoredWish(Number(head.headers.get('content-length')),Number(item.byte_size),context.maxBytes,new Uint8Array(await prefixResponse.arrayBuffer()),item.mime_type);
    const video=await cf('/copy','POST',{url:sign.signedUrl,requireSignedURLs:true,scheduledDeletion:new Date(Date.now()+31*24*3600*1000).toISOString(),meta:{name:`video-wish-validation-${item.id}`}});
    processorId=video.uid;
    if(video.requireSignedURLs!==true){await cf('/'+processorId,'DELETE');throw new Error('PROCESSOR_PRIVACY');}
    const {data:savedJob,error:saveError}=await db.from('video_wishes_uploads').update({processor_id:processorId}).eq('item_id',item.id).is('cleanup_completed_at',null).select('item_id');
    if(saveError||!savedJob?.length){await cf('/'+processorId,'DELETE');throw new Error('UPLOAD_UNAVAILABLE');}
   } catch(error) {
    await db.from('video_wishes_uploads').update({processing_started_at:null}).eq('item_id',item.id);
    throw error;
   }
  }
  const video=await cf('/'+processorId);
  try {
   if(validateProcessedWish(video,context.maxSeconds)==='pending')return respond({status:'processing'});
  }catch(error){
   await cf('/'+processorId,'DELETE');
   await db.from('event_media_items').update({upload_status:'failed'}).eq('id',item.id);
   await db.storage.from('event-media').remove([item.storage_path]);
   throw error;
  }
  // The original private storage object is immutable to anonymous uploaders.
  const {data:finished,error:finishError}=await db.from('event_media_items').update({duration_sec:Math.ceil(video.duration),wishes_verified_at:new Date().toISOString(),upload_status:'uploaded',uploaded_at:new Date().toISOString(),upload_token_used_at:new Date().toISOString()}).eq('id',item.id).eq('upload_status','pending').select('id');
  if(finishError||!finished?.length)throw new Error('UPLOAD_UNAVAILABLE');
  // A scheduled deletion also removes abandoned verification copies if immediate cleanup cannot run.
  await cf('/'+processorId,'DELETE').catch(()=>undefined);
  return respond({status:'uploaded'});
 }catch(error){
  const message=error instanceof Error?error.message:'UPLOAD_UNAVAILABLE';
  return respond({error:message},message==='PASSWORD_REQUIRED'?401:400);
 }
});



