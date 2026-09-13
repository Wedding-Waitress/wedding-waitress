import {useMemo} from 'react';
import {GalleryGuestbookMessagesCard,type GuestbookTextPreviewRow} from '@/components/Dashboard/PhotoVideoGallery/GalleryGuestbookMessagesCard';
import {useAdminPreviewMedia} from '@/hooks/useAdminPreviewMedia';
import type {GalleryItem} from '@/hooks/useEventMediaGallery';
import {isReadOnlyGalleryItems} from './AdminReadOnlyGallery';
const noWrite=async()=>{};
function VerifiedRecording({ownerId,eventId,item}:{ownerId:string;eventId:string;item:GalleryItem}){
 const media=useAdminPreviewMedia(ownerId,eventId,'event_media',item.id,true,item.storage_path);
 if(!media.url)return <p role={media.error?'alert':'status'}>{media.error?'The saved recording could not be verified.':'Verifying read-only access to this recording…'}</p>;
 return item.kind==='video'?<video src={media.url} controls autoPlay playsInline className="w-full max-h-[60vh] rounded-lg bg-black"/>:
  <audio src={media.url} controls autoPlay className="w-full"/>;
}
export function AdminReadOnlyGuestbook({ownerId,eventId,eventName,gallery,items,savedMessages}:{ownerId:string;eventId:string;eventName:string;gallery:unknown;items:unknown;savedMessages:unknown}){
 const row=gallery as Record<string,unknown>|null;
 const owned=!!row&&row.user_id===ownerId&&row.event_id===eventId&&typeof row.id==='string';
 const complete=owned&&Array.isArray(savedMessages)&&savedMessages.every(message=>message&&typeof message==='object'
  &&message.event_id===eventId&&message.gallery_id===row.id&&typeof message.id==='string'&&typeof message.message==='string'
  &&(message.uploader_name===null||typeof message.uploader_name==='string')&&(message.created_at===null||typeof message.created_at==='string')
  &&['approved','hidden'].includes(message.moderation_status)&&(message.guestbook_seq===null||Number.isSafeInteger(message.guestbook_seq)))
  &&isReadOnlyGalleryItems(items);
 const textRows=useMemo(()=>complete?(savedMessages as any[]).map(message=>({id:message.id,name:message.uploader_name,message:message.message,at:message.created_at,
  status:message.moderation_status,source:'text',seq:message.guestbook_seq})) as GuestbookTextPreviewRow[]:[],[complete,savedMessages]);
 if(!owned)return <p>No saved customer Guestbook is available. A customer Guestbook has not been created or substituted.</p>;
 if(!complete)return <p role="alert">Complete saved Guestbook messages and media classification are unavailable.</p>;
 return <section aria-label="Read-only saved Digital Guestbook">
  <p>Saved customer messages and recordings. Administrator preview does not change moderation, publish recordings or send notifications.</p>
  <GalleryGuestbookMessagesCard eventId={eventId} eventName={eventName} items={items as GalleryItem[]} onSetItemModeration={noWrite} onSetGuestbookShare={noWrite}
   appearance="espresso-glass" readOnly readOnlyTextRows={textRows}
   readOnlyRecordingPlayer={item=><VerifiedRecording key={item.id} ownerId={ownerId} eventId={eventId} item={item}/>}/>
 </section>;
}
