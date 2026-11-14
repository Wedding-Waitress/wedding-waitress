import React,{useCallback,useEffect,useRef,useState} from 'react';
import {supabase} from '@/integrations/supabase/client';
import {Switch} from '@/components/ui/switch';
import {useToast} from '@/hooks/use-toast';
import {Button} from '@/components/ui/enhanced-button';
import managementStyles from './photoVideoSharingManagement.module.css';
/** Same media records/bucket as the existing gallery; no second gallery or media copies. */
export function VideoWishesManagement({eventId}:{eventId:string}){
 const [items,setItems]=useState<any[]>([]),[loading,setLoading]=useState(true),[busy,setBusy]=useState<string|null>(null);const {toast}=useToast();
 const [failed,setFailed]=useState(false),[scopeEvent,setScopeEvent]=useState(eventId);const requestSequence=useRef(0);const activeEvent=useRef(eventId);activeEvent.current=eventId;
 const displayLoading=loading||scopeEvent!==eventId;
 const load=useCallback(async()=>{const request=++requestSequence.current;const current=()=>request===requestSequence.current&&activeEvent.current===eventId;setScopeEvent(eventId);setLoading(true);setFailed(false);try{
  const {data,error}=await (supabase as any).from('event_media_items').select('id,uploader_name,uploaded_at,storage_path,shared_to_gallery,shared_to_slideshow,moderation_status').eq('event_id',eventId).eq('source_category','video_wishes').eq('upload_status','uploaded').order('uploaded_at',{ascending:false});if(error)throw error;
  if(!current())return;
  if(!Array.isArray(data))throw new Error('Invalid Video Wishes response');
  if(!data.length){setItems([]);return;}
  const {data:signs,error:signError}=await supabase.storage.from('event-media').createSignedUrls(data.map((i:any)=>i.storage_path),3600);if(signError)throw signError;
  if(!signs||signs.length!==data.length||signs.some(sign=>sign.error||!sign.signedUrl))throw new Error('Could not sign Video Wishes media');
  const {data:attribution,error:attributionError}=await (supabase as any).rpc('get_video_wishes_attribution',{_event_id:eventId});if(attributionError)throw attributionError;
  const identities=new Map((attribution||[]).map((a:any)=>[a.item_id,a.identity_type]));
  if(current())setItems(data.map((item:any,index:number)=>({...item,identity:identities.get(item.id),url:signs[index].signedUrl})));
 }catch(error){if(current()){setFailed(true);console.warn('Video Wishes load failed',{code:(error as any)?.code,message:(error as any)?.message});toast({title:'Could not load Video Wishes',variant:'destructive',className:'[&_.text-success]:!text-white'});}}finally{if(current())setLoading(false);}},[eventId,toast]);
 useEffect(()=>{setItems([]);void load();return()=>{++requestSequence.current;};},[load]);
 const share=async(item:any,key:'shared_to_gallery'|'shared_to_slideshow',value:boolean)=>{setBusy(item.id);try{
  const {error}=await (supabase as any).from('event_media_items').update({[key]:value,...(value?{moderation_status:'approved'}:{})}).eq('id',item.id).eq('event_id',eventId).eq('source_category','video_wishes');if(error)throw error;
  if(activeEvent.current===eventId)setItems(previous=>previous.map(i=>i.id===item.id?{...i,[key]:value,...(value?{moderation_status:'approved'}:{})}:i));
 }catch{toast({title:'Could not update sharing',variant:'destructive'});}finally{setBusy(null);}};
 return <section className={`${managementStyles.videoWishesPanel} rounded-2xl border border-[#967a59] bg-[#24160f] text-[#f7ecd9] p-5 space-y-4`}><div className="flex flex-wrap justify-between gap-3"><h2 className="text-xl font-semibold">Video Wishes</h2><Button type="button" variant="outline" onClick={()=>void load()} disabled={displayLoading} className={`lv-premium-shade h-10 px-4 py-2 shrink-0 border-[#967A59] ${managementStyles.galleryControl} ${managementStyles.upperGlassControl}`}>Refresh</Button></div><p>Private messages from your guests. Gallery and slideshow sharing are separate choices. Slideshow video and album settings still apply.</p>{displayLoading?<p>Loading…</p>:failed?<p role="alert">Could not load Video Wishes. Use Refresh to try again.</p>:!items.length?<p>No Video Wishes yet.</p>:<div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{items.map(item=><article key={item.id} className="rounded-xl border border-[#967a59] p-4 space-y-3"><h3 className="font-semibold break-words">{item.uploader_name}</h3><p className="text-sm">{item.identity==='guest_supplied'?'Guest-supplied name (unverified)':'Personal invitation'}</p><p className="text-sm">{new Date(item.uploaded_at).toLocaleString()}</p><video src={item.url} controls playsInline preload="metadata" className="w-full aspect-video rounded-lg bg-black"/><label className="flex justify-between gap-3">Share in guest gallery<Switch aria-label={`Share ${item.uploader_name} in guest gallery`} checked={item.shared_to_gallery&&item.moderation_status==='approved'} disabled={busy===item.id} onCheckedChange={v=>void share(item,'shared_to_gallery',v)}/></label><label className="flex justify-between gap-3">Include in slideshow<Switch aria-label={`Include ${item.uploader_name} in slideshow`} checked={item.shared_to_slideshow&&item.moderation_status==='approved'} disabled={busy===item.id} onCheckedChange={v=>void share(item,'shared_to_slideshow',v)}/></label>{!item.shared_to_gallery&&!item.shared_to_slideshow&&<p className="text-sm">Private — organiser and authorised managers only</p>}</article>)}</div>}</section>;
}
