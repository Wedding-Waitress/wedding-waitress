import {useCallback,useEffect,useState} from 'react';
import {GallerySlideshowPreviewCard} from '@/components/Dashboard/PhotoVideoGallery/GallerySlideshowPreviewCard';
import {useAdminPreviewMedia} from '@/hooks/useAdminPreviewMedia';
import type {GalleryItem} from '@/hooks/useEventMediaGallery';
import {guestVisibleItems} from '@/lib/mediaPrivacy';
import {applySlideshowSettings,type SlideshowSettings} from '@/lib/slideshowSettings';
import {isReadOnlyGalleryItems} from './AdminReadOnlyGallery';
type Verified={url:string|null;error:boolean};
function SignedMedia({ownerId,eventId,item,onVerified}:{ownerId:string;eventId:string;item:GalleryItem;onVerified:(id:string,value:Verified)=>void}){
 const media=useAdminPreviewMedia(ownerId,eventId,'event_media',item.id,true,item.storage_path);
 useEffect(()=>{onVerified(item.id,{url:media.url,error:media.error});},[item.id,media.url,media.error,onVerified]);
 return null;
}
function VerifiedPlayback({ownerId,eventId,eventName,items,settings}:{ownerId:string;eventId:string;eventName:string;items:GalleryItem[];settings:SlideshowSettings}){
 const [records,setRecords]=useState<Record<string,Verified>>({});
 const onVerified=useCallback((id:string,value:Verified)=>setRecords(previous=>({...previous,[id]:value})),[]);
 const failed=items.some(item=>records[item.id]?.error),complete=items.every(item=>records[item.id]?.url);
 return <>{items.map(item=><SignedMedia key={item.id} ownerId={ownerId} eventId={eventId} item={item} onVerified={onVerified}/>)}
  {failed?<p role="alert">Saved slideshow media could not be verified. No incomplete or substituted playback is shown.</p>:!complete?<p role="status">Checking fresh owner-administrator access to each saved slideshow asset…</p>:<GallerySlideshowPreviewCard items={items.map(item=>({...item,signed_url:records[item.id].url!}))} eventName={eventName} settings={settings} appearance="espresso-glass" strictAssets/>}
 </>;
}
export function AdminReadOnlySlideshowPlayback({ownerId,eventId,eventName,galleryId,items,settings}:{ownerId:string;eventId:string;eventName:string;galleryId:string;items:unknown;settings:SlideshowSettings}){
 const [page,setPage]=useState(0),[load,setLoad]=useState(false);
 if(!isReadOnlyGalleryItems(items)||new Set(items.map(item=>item.id)).size!==items.length||!items.every(item=>(item as any).event_id===eventId&&(item as any).user_id===ownerId&&(item as any).gallery_id===galleryId))return <p>Complete owned slideshow media records are unavailable. No customer display or upload link has been launched.</p>;
 const selected=applySlideshowSettings(guestVisibleItems(items),settings),total=Math.ceil(selected.length/24),current=Math.min(page,Math.max(0,total-1)),visible=selected.slice(current*24,(current+1)*24);
 const identity=JSON.stringify([ownerId,eventId,galleryId,current,visible.map(item=>[item.id,item.storage_path]),settings]);
 return <section aria-label="Read-only saved slideshow playback"><p>{selected.length} saved approved media records match the recorded slideshow settings. This local preview does not launch a venue link or change media, settings or moderation.</p>
  {selected.length===0?<p>No saved approved media matches the recorded settings.</p>:<><button disabled={load} onClick={()=>setLoad(true)}>Load verified slideshow preview</button>{load&&<VerifiedPlayback key={identity} ownerId={ownerId} eventId={eventId} eventName={eventName} items={visible} settings={settings}/>}</>}
  {total>1&&<nav aria-label="Read-only slideshow media pages"><button disabled={current===0} onClick={()=>{setPage(current-1);setLoad(false);}}>Previous slideshow media page</button><span>Page {current+1} of {total}</span><button disabled={current+1>=total} onClick={()=>{setPage(current+1);setLoad(false);}}>Next slideshow media page</button></nav>}
 </section>;
}
