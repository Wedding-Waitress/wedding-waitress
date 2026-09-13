import {useState} from 'react';
import {GalleryGrid} from '@/components/Dashboard/PhotoVideoGallery/GalleryGrid';
import {MediaThumb} from '@/components/Dashboard/PhotoVideoGallery/MediaThumb';
import {GalleryLightbox} from '@/components/Dashboard/PhotoVideoGallery/GalleryLightbox';
import {useAdminPreviewMedia} from '@/hooks/useAdminPreviewMedia';
import {categoryOf,publicGalleryItems} from '@/lib/mediaPrivacy';
import type {GalleryItem} from '@/hooks/useEventMediaGallery';
function VerifiedMedia({ownerId,eventId,item,enabled,eventName,photoFit}:{ownerId:string;eventId:string;item:GalleryItem;enabled:boolean;eventName:string;photoFit:'contain'|'cover'}){
 const media=useAdminPreviewMedia(ownerId,eventId,'event_media',item.id,enabled,item.storage_path),[open,setOpen]=useState(false);
 const signedItem={...item,signed_url:media.url??undefined};
 return <><MediaThumb item={signedItem} photoFit={photoFit} appearance="espresso-glass" onOpen={()=>{if(media.url&&item.moderation_status==='approved')setOpen(true);}}/>
  {media.loading&&<span className="absolute bottom-1 left-1 text-xs">Verifying media…</span>}
  {open&&media.url&&<GalleryLightbox items={[signedItem]} eventName={eventName} index={0} onIndexChange={()=>{}} onClose={()=>setOpen(false)} readOnly showAlbumInfo/>}
 </>;
}
const noWrite=async()=>{};
export function isReadOnlyGalleryItems(items:unknown):items is GalleryItem[]{
 const nullableText=(value:unknown)=>value===null||typeof value==='string';
 return Array.isArray(items)&&items.every(item=>item&&typeof item==='object'&&typeof item.id==='string'
  &&typeof item.storage_path==='string'&&typeof item.mime_type==='string'&&Number.isSafeInteger(item.byte_size)&&item.byte_size>=0
  &&['photo','video','audio'].includes(item.kind)&&['approved','hidden'].includes(item.moderation_status)
  &&['uploader_name','caption','guestbook_message','uploaded_at','album','source_category'].every(key=>nullableText(item[key]))
  &&['is_guestbook','is_photo_booth','is_photo_booth_strip','shared_to_gallery'].every(key=>typeof item[key]==='boolean')
  &&(item.duration_sec===null||Number.isSafeInteger(item.duration_sec)));
}
export function AdminReadOnlyGallery({ownerId,eventId,eventName,gallery,items,booth=false}:{ownerId:string;eventId:string;eventName:string;gallery:unknown;items:unknown;booth?:boolean}){
 const [page,setPage]=useState(0),[load,setLoad]=useState(false);
 const row=gallery as Record<string,unknown>|null;
 if(!row||row.user_id!==ownerId||row.event_id!==eventId)
  return <p>No saved Photo &amp; Video gallery is available. A customer gallery has not been created or substituted.</p>;
 if(!isReadOnlyGalleryItems(items)||new Set(items.map(item=>item.id)).size!==items.length||!items.every(item=>(item as any).user_id===ownerId&&(item as any).event_id===eventId&&(item as any).gallery_id===row.id))
  return <p role="alert">Complete saved gallery classification and media records are unavailable.</p>;
 const actual=publicGalleryItems(items).filter(item=>!booth||categoryOf(item)==='photo_booth');
 const pageCount=Math.ceil(actual.length/24),currentPage=Math.min(page,Math.max(0,pageCount-1)),visible=actual.slice(currentPage*24,currentPage*24+24);
 return <section aria-label={booth?'Read-only saved Photo Booth captures':'Read-only saved Photo & Video gallery'}>
  <p>Saved media records: {actual.length}. Media links require fresh owner-administrator verification; customer links, passwords and upload credentials are unavailable.</p>
  <button disabled={load||visible.length===0} onClick={()=>setLoad(true)}>Load verified media for this page</button>
  {pageCount>1&&<nav aria-label="Media record pages"><button disabled={currentPage===0} onClick={()=>{setPage(currentPage-1);setLoad(false);}}>Previous media page</button>
   <span>Page {currentPage+1} of {pageCount}</span><button disabled={currentPage+1>=pageCount} onClick={()=>{setPage(currentPage+1);setLoad(false);}}>Next media page</button></nav>}
  <GalleryGrid key={`${ownerId}:${eventId}:${currentPage}`} items={visible} onDelete={noWrite} onSetModeration={noWrite} onSetAlbum={noWrite}
   onBulkSetAlbum={async()=>0} eventName={eventName} readOnly appearance="espresso-glass" hideCardActions boothSetOrder={booth} hideAlbumFeature={booth}
   description="Read-only saved customer media. Browsing does not approve, hide, share, move or delete uploads."
   readOnlyMediaRenderer={(item,photoFit)=><VerifiedMedia key={item.id} ownerId={ownerId} eventId={eventId} item={item} enabled={load} eventName={eventName} photoFit={photoFit}/>}/>
 </section>;
}
