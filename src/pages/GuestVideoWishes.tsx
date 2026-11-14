import { useQrGuestTheme } from '@/hooks/useQrGuestTheme';
import React,{useEffect,useRef,useState} from 'react';
import {useLocation,useNavigate,useParams} from 'react-router-dom';
import {Video,Upload,ArrowLeft,Send,Square} from 'lucide-react';
import type * as tus from 'tus-js-client';
import {supabase,SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY} from '@/integrations/supabase/client';
import uploadHeaderLogo from '@/assets/upload-header-logo.png';
import {GalleryFooterLogo} from '@/components/Dashboard/PhotoVideoGallery/GalleryFooterLogo';
import {VideoWishesRecorder,VIDEO_WISHES_MIMES} from '@/lib/videoWishesRecorder';
import {useVideoWishesCopy} from '@/i18n/useVideoWishesCopy';

type Context={event:{id:string;name:string;date:string};maxBytes:number;maxSeconds:number;mainGuestId:string|null;hasFamily:boolean;members:{id:string;name:string}[]};
const button='min-h-12 rounded-xl px-5 py-3 font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2';
const brown={background:'linear-gradient(180deg,#573a2b,#29170f)',boxShadow:'inset 0 1px 1px #b6966b80,0 4px 10px #0005'};
const green={background:'linear-gradient(180deg,#7bd880,#55a447)',textShadow:'0 1px 2px #0008'};
export default function GuestVideoWishes(){
 useQrGuestTheme();
 const {eventSlug=''}=useParams();const location=useLocation();const navigate=useNavigate();const {copy:c,language}=useVideoWishesCopy();
 // Router state keeps the invitation credential out of this screen's URL and referrers.
 const invite=typeof location.state?.videoWishesInvite==='string'?location.state.videoWishesInvite:'';
 const [context,setContext]=useState<Context|null>(null),[password,setPassword]=useState(''),[passwordNeeded,setPasswordNeeded]=useState(false),[loading,setLoading]=useState(true);
 const [sender,setSender]=useState('general'),[name,setName]=useState(''),[blob,setBlob]=useState<Blob|null>(null),[url,setUrl]=useState('');
 const [stream,setStream]=useState<MediaStream|null>(null),[recording,setRecording]=useState(false),[elapsed,setElapsed]=useState(0),[error,setError]=useState('');
 const [busy,setBusy]=useState(false),[progress,setProgress]=useState(0),[processing,setProcessing]=useState(false),[success,setSuccess]=useState(false);
 const videoRef=useRef<HTMLVideoElement>(null),fileRef=useRef<HTMLInputElement>(null),recorder=useRef<VideoWishesRecorder|null>(null),active=useRef(true),upload=useRef<tus.Upload|null>(null),sending=useRef(false);
 const attempt=useRef<{requestId:string;secret:string;uploaded:boolean}|null>(null);
 const call=async(action:string,extra:Record<string,unknown>={})=>{
  const {data,error}=await supabase.functions.invoke('video-wishes',{body:{action,slug:eventSlug,invite,password,...extra}});
  if(error){let code='';try{code=(await error.context.json()).error;}catch{}throw new Error(code||'UPLOAD_UNAVAILABLE');}
  if(data?.error)throw new Error(data.error);return data;
 };
 const load=async()=>{setLoading(true);setError('');try{const data=await call('context');setContext(data);setSender(data.mainGuestId||'general');setPasswordNeeded(false);}catch(e){if((e as Error).message==='PASSWORD_REQUIRED')setPasswordNeeded(true);else setError('unavailable');}finally{setLoading(false);}};
 useEffect(()=>{void load();},[eventSlug,invite]);
 useEffect(()=>{active.current=true;return()=>{active.current=false;recorder.current?.cancel();void upload.current?.abort();};},[]);
 useEffect(()=>{if(!blob){setUrl('');return;}const next=URL.createObjectURL(blob);setUrl(next);return()=>URL.revokeObjectURL(next);},[blob]);
 useEffect(()=>{if(videoRef.current)videoRef.current.srcObject=stream;},[stream]);
 useEffect(()=>{const warn=(e:BeforeUnloadEvent)=>{if(busy){e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[busy]);
 const selectBlob=(next:Blob)=>{attempt.current=null;setBlob(next);setProgress(0);setProcessing(false);setError('');};
 const chooseFile=async(file?:File)=>{
  if(!file||!context)return;recorder.current?.cancel();setStream(null);setRecording(false);setError('');
  if(!VIDEO_WISHES_MIMES.includes(file.type)||!file.size||file.size>context.maxBytes){setError('invalid');return;}
  const probe=document.createElement('video'),temp=URL.createObjectURL(file);
  try{const duration=await new Promise<number>((resolve,reject)=>{const timeout=setTimeout(()=>reject(new Error()),10000);probe.preload='metadata';probe.onloadedmetadata=()=>{clearTimeout(timeout);resolve(probe.duration);};probe.onerror=()=>{clearTimeout(timeout);reject(new Error());};probe.src=temp;});
   if(!Number.isFinite(duration)||duration<=0||duration>context.maxSeconds){setError('invalid');return;}selectBlob(file);
  }catch{setError('invalid');}finally{probe.removeAttribute('src');probe.load();URL.revokeObjectURL(temp);}
 };
 const openCamera=()=>{if(!context)return;setError('');setBlob(null);attempt.current=null;recorder.current?.cancel();
  recorder.current=new VideoWishesRecorder({preview:setStream,elapsed:setElapsed,recorded:value=>{setRecording(false);setStream(null);selectBlob(value);},error:()=>{setRecording(false);setStream(null);setError('cameraError');}},context.maxSeconds,context.maxBytes);void recorder.current.open();
 };
 const cancel=()=>{recorder.current?.cancel();setStream(null);setRecording(false);setBlob(null);attempt.current=null;setError('');};
 const send=async()=>{
  if(!blob||!context||sending.current)return;
  if(!context.mainGuestId&&(name.trim().length<2||name.trim().length>120)){setError('name');return;}
  sending.current=true;setBusy(true);setError('');
  if(!attempt.current)attempt.current={requestId:crypto.randomUUID(),secret:crypto.randomUUID()+crypto.randomUUID(),uploaded:false};
  const current=attempt.current;
  try{
   const reservation=await call('reserve',{...current,mime:blob.type.split(';')[0],bytes:blob.size,sender,name});
   if(reservation.status==='uploaded'){setSuccess(true);return;}
   if(reservation.filePresent)current.uploaded=true;
   if(!current.uploaded){
    const tus = await import('tus-js-client');
    if(!active.current)return;
    await new Promise<void>((resolve,reject)=>{
     const up=new tus.Upload(blob,{endpoint:`${SUPABASE_URL}/storage/v1/upload/resumable`,headers:{authorization:`Bearer ${SUPABASE_PUBLISHABLE_KEY}`,apikey:SUPABASE_PUBLISHABLE_KEY,'x-upsert':'false'},
      retryDelays:[0,1000,3000,5000],chunkSize:6*1024*1024,uploadDataDuringCreation:true,removeFingerprintOnSuccess:true,
      fingerprint:async()=>`video-wish-${current.requestId}`,
      metadata:{bucketName:'event-media',objectName:reservation.path,contentType:blob.type.split(';')[0],cacheControl:'0'},
      onProgress:(sent,total)=>{if(active.current)setProgress(Math.round(sent/total*100));},onError:reject,onSuccess:()=>resolve()});
     upload.current=up;up.findPreviousUploads().then(previous=>{if(previous[0])up.resumeFromPreviousUpload(previous[0]);if(active.current)up.start();else reject(new Error());}).catch(reject);
    });current.uploaded=true;
   }
   setProcessing(true);
   for(let i=0;i<120&&active.current;i++){
    const result=await call('verify',current);
    if(result.status==='uploaded'){setSuccess(true);setBlob(null);return;}
    await new Promise(resolve=>setTimeout(resolve,2500));
   }
   throw new Error('UPLOAD_UNAVAILABLE');
  }catch(e){const code=(e as Error).message;setError(['INVALID_VIDEO','VIDEO_TOO_LONG','VIDEO_TOO_LARGE'].includes(code)?'invalid':'retry');if(['INVALID_VIDEO','VIDEO_TOO_LONG','VIDEO_TOO_LARGE','UPLOAD_EXPIRED'].includes(code))attempt.current=null;}
  finally{sending.current=false;if(active.current){setBusy(false);setProcessing(false);}}
 };
 const back=()=>{recorder.current?.cancel();navigate(`/s/${encodeURIComponent(eventSlug)}${invite?'?invite='+encodeURIComponent(invite):''}`);};
 return <main data-qr-video-wishes dir={language==='ar'?'rtl':'ltr'} className="relative min-h-[100svh] px-5 py-12 text-center text-white" style={{backgroundImage:'linear-gradient(to bottom,rgba(0,0,0,.7),rgba(0,0,0,.6),rgba(0,0,0,.8)),url(/default-hero-bg.png)',backgroundSize:'cover',backgroundPosition:'center'}}>
  <div className="mx-auto max-w-2xl space-y-6">
   <img src={uploadHeaderLogo} alt={c.artwork} className="mx-auto w-[75vw] max-w-[360px] rounded-full"/>
   {context&&<><p className="text-[#e4c58f]">{new Date(context.event.date+'T12:00:00').toLocaleDateString(language,{day:'numeric',month:'long',year:'numeric'})}</p><h1 className="text-3xl sm:text-4xl font-semibold break-words">{context.event.name}</h1></>}
   <h2 className="text-2xl font-semibold">{c.title}</h2><p className="text-lg">{c.subtitle}</p>
   {loading?<p role="status">{c.loading}</p>:passwordNeeded?<form onSubmit={e=>{e.preventDefault();void load();}} className="space-y-4"><label className="block">{c.password}<input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="block mx-auto mt-2 max-w-full rounded-lg p-3 text-black"/></label><button className={button} style={green}>{c.continue}</button></form>:success?<p role="status" className="rounded-xl bg-green-950/80 p-6 text-2xl">{c.success}</p>:context&&<section className="space-y-5 rounded-2xl border border-[#967a59] bg-[#1b100bd9] p-4 sm:p-6">
    <p>{c.limits.replace('{seconds}',String(context.maxSeconds)).replace('{size}',String(Math.floor(context.maxBytes/1048576)))}</p>
    <p className="text-[#ead9bf]">{c.privacy}</p>
    <fieldset disabled={busy||!!attempt.current} className="space-y-2">
    {context.mainGuestId?<label className="block">{c.sendingAs}<select value={sender} onChange={e=>setSender(e.target.value)} className="block w-full mt-2 rounded-lg p-3 bg-[#3b261c] border border-[#967a59]">{context.members.map(member=><option key={member.id} value={member.id}>{member.name}</option>)}{context.hasFamily&&<option value="family">{c.family}</option>}</select></label>:<label className="block">{c.name}<input value={name} onChange={e=>setName(e.target.value)} maxLength={120} autoComplete="name" className="block w-full mt-2 rounded-lg bg-[#3b261c] border border-[#967a59] p-3"/><small>{c.unverified}</small></label>}
    </fieldset>
    <input ref={fileRef} type="file" accept="video/mp4,video/quicktime,video/webm" className="hidden" aria-label={c.upload} onChange={e=>{void chooseFile(e.target.files?.[0]);e.target.value='';}}/>
    {!stream&&!blob&&<div className="flex flex-wrap justify-center gap-3"><button disabled={busy} className={button} style={brown} onClick={openCamera}><Video aria-hidden="true"/>{c.record}</button><button disabled={busy} className={button} style={brown} onClick={()=>fileRef.current?.click()}><Upload aria-hidden="true"/>{c.upload}</button></div>}
    {stream&&<><video ref={videoRef} autoPlay muted playsInline className="w-full max-h-[45vh] rounded-xl bg-black"/><p role="status" className={recording?'text-red-300':''}>{recording&&'● '+c.recording+' · '}{elapsed}s / {context.maxSeconds}s</p><button className={button} style={recording?brown:green} onClick={()=>{if(recording)recorder.current?.stop();else{setRecording(true);recorder.current?.start();}}}>{recording?<Square aria-hidden="true"/>:<Video aria-hidden="true"/>}{recording?c.stop:c.start}</button><button className={button} style={brown} onClick={cancel}>{c.cancel}</button></>}
    {blob&&<><video src={url} controls playsInline className="w-full max-h-[45vh] rounded-xl bg-black"/><div className="flex flex-wrap justify-center gap-3"><button disabled={busy} className={button} style={brown} onClick={openCamera}>{c.record}</button><button disabled={busy} className={button} style={brown} onClick={()=>fileRef.current?.click()}>{c.replace}</button><button disabled={busy} className={button} style={brown} onClick={cancel}>{c.cancel}</button></div><button disabled={busy} className={`${button} w-full`} style={green} onClick={()=>void send()}><Send aria-hidden="true"/>{c.send}</button></>}
    {busy&&<div role="status"><progress aria-label={c.send} value={progress} max={100} className="w-full"/>{processing?c.processing:`${progress}%`}</div>}
   </section>}
   {error&&<p role="alert" className="rounded-lg bg-red-950 p-3">{c[error as keyof typeof c]||c.retry}</p>}
   <button disabled={busy} onClick={back} className={button} style={brown}><ArrowLeft aria-hidden="true"/>{c.back}</button>
   <GalleryFooterLogo tone="brown" className="pt-6"/>
  </div>
 </main>;
}


