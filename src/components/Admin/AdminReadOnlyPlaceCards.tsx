import { useEffect, useRef, useState } from 'react';
import { PlaceCardPreview } from '@/components/Dashboard/PlaceCards/PlaceCardPreview';
import { normalizePlaceCardSettings } from '@/hooks/usePlaceCardSettings';
import type { Guest } from '@/hooks/useGuests';
import type { AdminPreviewDocumentEvent } from './AdminReadOnlyCeremonyPlan';
import { useAdminPreviewMedia } from '@/hooks/useAdminPreviewMedia';
import { readPlaceCardScopedFit } from '@/lib/placeCardScopedImageFit';

const textKeys = ['font_family','font_color','background_color','background_image_url','background_image_type',
  'front_image_url','back_image_url','mass_message','guest_font_family','info_font_family','info_font_color'];
const booleanKeys = ['guest_name_bold','guest_name_italic','guest_name_underline','background_behind_names',
  'background_behind_table_seats','info_bold','info_italic','info_underline'];
const numberKeys = ['background_image_x_position','background_image_y_position','background_image_scale','background_image_opacity',
  'guest_name_font_size','info_font_size','name_spacing','guest_name_offset_x','guest_name_offset_y','table_offset_x','table_offset_y',
  'seat_offset_x','seat_offset_y','guest_name_rotation','table_seat_rotation'];
const qrKeys = ['photo_video_qr_enabled','photo_video_qr_x','photo_video_qr_y','photo_video_qr_size'];
export function AdminReadOnlyPlaceCards({ ownerId,eventId,event,savedSettings,savedFit,guests,tables }: {
  ownerId:string;eventId:string;event:AdminPreviewDocumentEvent;savedSettings:unknown;savedFit?:unknown;guests:unknown[];tables:unknown[];
}) {
  const [selectedTableId,setSelectedTableId]=useState(''),[page,setPage]=useState(0),[busy,setBusy]=useState(false),[error,setError]=useState(false);
  const previewRef=useRef<HTMLDivElement|null>(null);
  const row=savedSettings as Record<string,unknown>|null;
  const owned=row?.user_id===ownerId&&row?.event_id===eventId;
  const artwork=owned&&typeof row.background_image_url==='string'&&!!row.background_image_url;
  const media=useAdminPreviewMedia(ownerId,eventId,'place_card_background',typeof row?.id==='string'?row.id:undefined,Boolean(artwork&&row?.photo_video_qr_enabled===false),JSON.stringify([row?.background_image_url]));
  const [loadedArtwork,setLoadedArtwork]=useState<string|null>(null),[failedArtwork,setFailedArtwork]=useState<string|null>(null);
  const artworkIdentity=JSON.stringify([ownerId,eventId,row?.id,media.url]);
  useEffect(()=>{
    setLoadedArtwork(null);setFailedArtwork(null);
    if(!media.url)return;
    let active=true;const image=new Image();image.crossOrigin='anonymous';
    const timer=setTimeout(()=>{if(active)setFailedArtwork(artworkIdentity);},10000);
    image.onload=()=>{if(active){clearTimeout(timer);setLoadedArtwork(artworkIdentity);}};
    image.onerror=()=>{if(active){clearTimeout(timer);setFailedArtwork(artworkIdentity);}};
    image.src=media.url;
    return()=>{active=false;clearTimeout(timer);image.onload=null;image.onerror=null;};
  },[media.url,artworkIdentity]);
  if(!row||row.user_id!==ownerId||row.event_id!==eventId)
    return <p>No saved Place Card customization is available. A default customer document has not been substituted.</p>;
  const nullable=(value:unknown,type:string)=>value===null||typeof value===type;
  if(!textKeys.every(key=>key in row&&nullable(row[key],'string'))
    || !booleanKeys.every(key=>key in row&&nullable(row[key],'boolean'))
    || !numberKeys.every(key=>key in row&&(row[key]===null||typeof row[key]==='number'&&Number.isFinite(row[key])))
    || !row.individual_messages||typeof row.individual_messages!=='object'||Array.isArray(row.individual_messages)
    || !Object.values(row.individual_messages).every(value=>typeof value==='string')
    || new Set(guests.map(value=>(value as any)?.id)).size!==guests.length
    || new Set(tables.map(value=>(value as any)?.id)).size!==tables.length
    || !guests.every(value=>value&&typeof value==='object'&&(value as any).user_id===ownerId&&(value as any).event_id===eventId&&['id','first_name','last_name'].every(key=>typeof (value as any)[key]==='string')
      &&typeof (value as any).assigned==='boolean'&&nullable((value as any).table_id,'string')
      &&['table_no','seat_no'].every(key=>(value as any)[key]===null||Number.isSafeInteger((value as any)[key])))
    || !tables.every(value=>value&&typeof value==='object'&&(value as any).user_id===ownerId&&(value as any).event_id===eventId&&typeof (value as any).id==='string'&&typeof (value as any).name==='string'
      &&((value as any).table_no===null||Number.isSafeInteger((value as any).table_no))))
    return <p role="alert">Complete saved Place Card content is unavailable.</p>;
  // Missing QR columns can mean a customer browser-only choice. Never silently disable it.
  if(!qrKeys.every(key=>key in row)||typeof row.photo_video_qr_enabled!=='boolean')
    return <p role="alert">The saved Place Card QR settings cannot be verified. Historical browser-only choices have not been substituted.</p>;
  if(row.photo_video_qr_enabled)
    return <p role="alert">The saved Place Card upload QR requires verified read-only access. No incomplete document is shown.</p>;
  const settings=normalizePlaceCardSettings(row,eventId,ownerId);
  if(!['none','decorative','full','full_front','full_back'].includes(settings.background_image_type))
    return <p role="alert">The saved Place Card background geometry cannot be verified.</p>;
  // These legacy columns are retained in the record but the current customer
  // PlaceCardPreview does not consume them. Do not invent storage grants or
  // add historical artwork that is absent from the actual customer output.
  const unusedLegacyArtwork=Boolean(settings.front_image_url||settings.back_image_url);
  const backgroundFit=settings.background_image_url&&['full','full_front','full_back'].includes(settings.background_image_type)?readPlaceCardScopedFit(savedFit,settings):'contain';
  if(!backgroundFit)return <p role="alert">The saved Place Card crop choice cannot be verified. Historical browser-only choices have not been substituted.</p>;
  if(artwork&&(!media.url||loadedArtwork!==artworkIdentity))return <p role={media.error||failedArtwork===artworkIdentity?'alert':'status'}>{media.error||failedArtwork===artworkIdentity?'The saved Place Card artwork could not be loaded and verified.':'Checking verified read-only access to the saved Place Card artwork…'} No incomplete document is shown.</p>;
  const verifiedSettings=artwork?{...settings,background_image_url:media.url}:settings;
  const table=tables.find(value=>(value as any).id===selectedTableId) as {id:string;name:string;table_no:number|null}|undefined;
  const assignedGuests=table?guests.filter(value=>(value as any).assigned&&(value as any).table_id===table.id) as Guest[]:[];
  const totalPages=Math.ceil(assignedGuests.length/6);
  const download=async()=>{
    if(!previewRef.current||busy||totalPages===0)return;setBusy(true);setError(false);
    try{
      const {exportAllPlaceCardsToPdf}=await import('@/lib/placeCardsPdfExporter');
      await exportAllPlaceCardsToPdf({pageElement:()=>previewRef.current,pageIndex:page,totalPages,eventName:event.name,
        showPage:async index=>{setPage(index);await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));}});
    }catch{setError(true);}finally{setBusy(false);}
  };
  return <section aria-label="Read-only saved Place Cards">
    {unusedLegacyArtwork&&<p>Legacy front/back image fields are recorded but unused by the current customer renderer. They have not been loaded, substituted or added to this document.</p>}
    <label>Table<select value={selectedTableId} disabled={busy} onChange={e=>{setSelectedTableId(e.target.value);setPage(0);}}>
      <option value="">Select a table</option>{tables.map(value=>{const t=value as {id:string;name:string};return <option key={t.id} value={t.id}>{t.name}</option>;})}
    </select></label>
    {!table?<p>Select a table to view its saved place cards.</p>:assignedGuests.length===0?<p>No assigned guests recorded for this table.</p>:<>
      <button disabled={busy} onClick={()=>void download()}>Download all place cards PDF</button>
      {error&&<p role="alert">The saved Place Card PDF could not be verified. No customer changes were made.</p>}
      <PlaceCardPreview ref={previewRef} settings={verifiedSettings} backgroundFit={backgroundFit} guests={assignedGuests} event={event} selectedTable={table}
        textEditMode={false} qrEditMode={false} pageIndex={page} onPageChange={busy?undefined:setPage} isExporting={busy}/>
    </>}
  </section>;
}
