import {useState} from 'react';
import {EventImageFrame} from '@/components/EventImage/EventImageEditor';
import {useAdminPreviewMedia} from '@/hooks/useAdminPreviewMedia';
export function AdminReadOnlyEventArtwork({ownerId,eventId,savedEvent}:{ownerId:string;eventId:string;savedEvent:unknown}){
 const row=savedEvent as Record<string,any>|null;
 const owned=!!row&&row.id===eventId&&row.user_id===ownerId;
 const hasFields=owned&&['event_image_path','event_image_fit','event_image_position_x','event_image_position_y','event_image_zoom'].every(key=>key in row);
 const complete=hasFields&&typeof row.event_image_path==='string'&&!!row.event_image_path&&['cover','contain'].includes(row.event_image_fit)&&['event_image_position_x','event_image_position_y'].every(key=>Number.isFinite(row[key])&&row[key]>=0&&row[key]<=100)&&Number.isFinite(row.event_image_zoom)&&row.event_image_zoom>=100&&row.event_image_zoom<=200;
 const media=useAdminPreviewMedia(ownerId,eventId,'event_image',eventId,complete,row?.event_image_path);
 const identity=JSON.stringify([ownerId,eventId,row,media.url]),[failed,setFailed]=useState<string|null>(null);
 if(!hasFields)return <p>Saved event artwork history is unavailable. No crop or image choice has been inferred.</p>;
 if(row.event_image_path===null)return <p>No saved event photo or logo.</p>;
 if(!complete)return <p role="alert">The saved event image or crop is incomplete. No default crop has been substituted.</p>;
 if(!media.url)return <p role={media.error?'alert':'status'}>Saved event artwork is awaiting verified read-only access.</p>;
 if(failed===identity)return <p role="alert">Saved event artwork failed to load. No substitute image is shown.</p>;
 return <section aria-label="Read-only saved event artwork"><h3>Saved event photo or logo</h3><EventImageFrame url={media.url} value={{path:row.event_image_path,fit:row.event_image_fit,positionX:row.event_image_position_x,positionY:row.event_image_position_y,zoom:row.event_image_zoom}} onError={()=>setFailed(identity)}/><p>Saved {row.event_image_fit} crop · {row.event_image_position_x}% / {row.event_image_position_y}% · {row.event_image_zoom}% zoom. No upload or editing actions.</p></section>;
}
