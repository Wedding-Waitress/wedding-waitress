import React,{useEffect,useMemo,useRef,useState} from 'react';
import {InvitationCardPreview} from '@/components/Dashboard/Invitations/InvitationCardPreview';
import {invitationCardSettingsFromRow,type InvitationCardSettings} from '@/hooks/useInvitationCardSettings';
import {invitationEventDataFromEvent,type InvitationEventDataSource} from '@/lib/invitationEventData';
import {INVITATION_CARD_SIZES,type InvitationCardSize} from '@/lib/invitationCardSizes';
import {generateInvitationQR} from '@/lib/invitationQR';
import {useAdminPreviewMedia} from '@/hooks/useAdminPreviewMedia';
export function AdminReadOnlyInvitations({artworks,event,eventId,eventSlug,qrEvents=[],customerId}:{artworks:InvitationCardSettings[]|undefined;event:InvitationEventDataSource;eventId:string;eventSlug?:string|null;qrEvents?:{id:string;slug?:string|null}[];customerId?:string}){
 const [selected,setSelected]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(false),[qrFailure,setQrFailure]=useState(false),[qr,setQr]=useState<{identity:string;url:string}|null>(null);
 const documentRef=useRef<HTMLDivElement|null>(null);
 const artwork=useMemo(()=>{const saved=artworks?.find(a=>a.id===selected)??artworks?.[0];return saved?invitationCardSettingsFromRow(saved):null;},[artworks,selected]);
 const privateBackground=!!artwork?.background_image_url&&artwork.background_image_type==='full'&&(()=>{
  try{const source=new URL(artwork.background_image_url);return source.origin===new URL(import.meta.env.VITE_SUPABASE_URL).origin&&source.pathname.startsWith('/storage/v1/object/public/invitations/');}catch{return false;}
 })();
 const media=useAdminPreviewMedia(customerId,eventId,'invitation_background',artwork?.id,privateBackground,artwork?.background_image_url??undefined);
 const qrEvent=qrEvents.find(e=>e.id===artwork?.qr_config.event_id)??{id:eventId,slug:eventSlug};
 const qrIdentity=JSON.stringify([qrEvent.id,qrEvent.slug,artwork?.id,artwork?.qr_config]);
 useEffect(()=>{let active=true;setQr(null);setQrFailure(false);if(!artwork?.qr_config.enabled||!qrEvent.slug)return;
  void generateInvitationQR(qrEvent.slug,qrEvent.id).then(url=>{if(active)setQr({identity:qrIdentity,url});}).catch(()=>{if(active)setQrFailure(true);});
  return()=>{active=false;};
 },[qrIdentity,qrEvent.slug,qrEvent.id,artwork?.qr_config.enabled]);
 const qrUrl=qr?.identity===qrIdentity?qr.url:null;
 if(artworks===undefined)return <p>Saved Invitations and Cards preview data is unavailable.</p>;
 if(!artwork)return <p>No saved Invitations or Cards recorded.</p>;
 const size=INVITATION_CARD_SIZES[artwork.card_size as InvitationCardSize];
 if(!size||!['portrait','landscape'].includes(artwork.orientation)||!Array.isArray(artwork.text_zones))return <p role="alert">The saved card geometry cannot be verified.</p>;
 if(artwork.qr_config.enabled&&!qrUrl)return <p role={qrFailure||!qrEvent.slug?'alert':'status'}>{qrFailure?'The saved card QR code could not be verified. No incomplete document is shown.':qrEvent.slug?'Checking the saved card QR code…':'The saved card QR reference is unavailable. No incomplete document is shown.'}</p>;
 if(artwork.background_image_type==='full'&&artwork.background_image_url){
  let trusted=false;
  try{const source=new URL(artwork.background_image_url,window.location.origin);trusted=source.origin===window.location.origin&&source.pathname.startsWith('/lovable-uploads/')||source.origin===new URL(import.meta.env.VITE_SUPABASE_URL).origin&&source.pathname.startsWith('/storage/v1/object/public/invitation-gallery/');}catch{}
  if(privateBackground&&!media.url)return <p role={media.error?'alert':'status'}>{media.error?'The saved card background could not be verified. No incomplete preview or PDF is shown.':'Checking verified read-only access to the saved card background…'}</p>;
  if(!trusted&&!privateBackground)return <p role="alert">The saved card background requires verified read-only media access. No incomplete preview or PDF is shown.</p>;
 }
 const download=async()=>{
  if(!documentRef.current||busy)return;setBusy(true);setError(false);
  try{const {exportInvitationPreviewPDF}=await import('@/lib/invitationPreviewPdfExporter');const landscape=artwork.orientation==='landscape';
   await exportInvitationPreviewPDF({pageElement:documentRef.current,widthMm:landscape?size.h:size.w,heightMm:landscape?size.w:size.h},`${artwork.name}-WeddingWaitress-${event.name}.pdf`);
  }catch{setError(true);}finally{setBusy(false);}
 };
 return <section aria-label="Read-only Invitations and Cards">
  <label>Saved artwork<select value={artwork.id} onChange={e=>setSelected(e.target.value)}>{artworks.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
  <button disabled={busy} onClick={()=>void download()}>Download card PDF</button>
  {error&&<p role="alert">The saved card preview or PDF could not be verified. No customer changes were made.</p>}
  <InvitationCardPreview settings={privateBackground?{...artwork,background_image_url:media.url}:artwork} eventData={invitationEventDataFromEvent(event)} documentRef={documentRef} documentId="invitation-card" qrDataUrl={qrUrl} fitToWidth/>
 </section>;
}
