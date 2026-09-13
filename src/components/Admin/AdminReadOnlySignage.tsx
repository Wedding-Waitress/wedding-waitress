import {useEffect,useRef,useState} from 'react';
import {InvitationCardPreview} from '@/components/Dashboard/Invitations/InvitationCardPreview';
import type {InvitationCardSettings} from '@/hooks/useInvitationCardSettings';
import {resolveWeddingFontZones} from '@/lib/localWeddingFonts';
import {SIGNAGE_PRINT_DIMENSIONS,signageEventDataFromEvent,type SignageEventDataSource} from '@/lib/signageDocumentData';
import {generateInvitationQR} from '@/lib/invitationQR';
import {useAdminPreviewMedia} from '@/hooks/useAdminPreviewMedia';
export function AdminReadOnlySignage({ownerId,eventId,event,savedSettings,qrEvents=[]}:{ownerId:string;eventId:string;event:SignageEventDataSource;savedSettings:unknown;qrEvents?:{id:string;slug?:string|null}[]}){
 const [paper,setPaper]=useState('a1'),[busy,setBusy]=useState(false),[error,setError]=useState(false),[qr,setQr]=useState<{identity:string;url:string}|null>(null),[qrError,setQrError]=useState(false);
 const ref=useRef<HTMLDivElement|null>(null),row=savedSettings as Record<string,any>|null;
 const owned=!!row&&row.user_id===ownerId&&row.event_id===eventId;
 const background=owned?(row.background_image_print_url||row.background_image_url):null;
 let uploaded=false,trustedGallery=false;
 if(typeof background==='string')try{
  const source=new URL(background);const configured=new URL(import.meta.env.VITE_SUPABASE_URL);
  const safe=source.origin===configured.origin&&!source.search&&!source.hash;
  uploaded=safe&&source.pathname.startsWith('/storage/v1/object/public/invitations/');
  trustedGallery=safe&&source.pathname.startsWith('/storage/v1/object/public/signage-gallery/');
 }catch{}
 const media=useAdminPreviewMedia(ownerId,eventId,'signage_background',row?.id,owned&&uploaded,background??undefined);
 const qrConfig=owned&&row.qr_config&&typeof row.qr_config==='object'?row.qr_config:null;
 const qrEvent=qrEvents.find(value=>value.id===qrConfig?.event_id);
 const identity=JSON.stringify([ownerId,eventId,row?.id,qrConfig,qrEvent?.slug]);
 useEffect(()=>{let active=true;setQr(null);setQrError(false);if(!owned||qrConfig?.enabled!==true||!qrEvent?.slug)return;
  void generateInvitationQR(qrEvent.slug,qrEvent.id).then(url=>{if(active)setQr({identity,url});}).catch(()=>{if(active)setQrError(true);});
  return()=>{active=false;};
 },[identity,owned,qrConfig?.enabled,qrEvent?.slug,qrEvent?.id]);
 if(!owned)return <p>No saved Seating Chart Sign customization is available. A default customer sign has not been substituted.</p>;
 const nullableText=(value:unknown)=>value===null||typeof value==='string';
 if(!['portrait','landscape'].includes(row.orientation)||!['none','full'].includes(row.background_image_type)
  ||typeof row.background_color!=='string'||!['background_image_url','background_image_print_url'].every(key=>key in row&&nullableText(row[key]))
  ||!['background_image_x_position','background_image_y_position','background_image_opacity'].every(key=>typeof row[key]==='number'&&Number.isFinite(row[key]))
  ||!Array.isArray(row.text_zones)||!row.text_zones.every((zone:any)=>zone&&typeof zone==='object'
   &&['id','label','type','text','font_family','font_color','font_weight','font_style','text_align','text_case'].every(key=>typeof zone[key]==='string')
   &&['font_size','x_percent','y_percent','width_percent','rotation'].every(key=>typeof zone[key]==='number'&&Number.isFinite(zone[key]))
   &&['preset','custom'].includes(zone.type))
  ||!qrConfig||typeof qrConfig.enabled!=='boolean'
  ||!['x_percent','y_percent','size_percent','rotation'].every(key=>typeof qrConfig[key]==='number'&&Number.isFinite(qrConfig[key]))
  ||!(qrConfig.event_id===null||typeof qrConfig.event_id==='string'))
  return <p role="alert">Complete saved Seating Chart Sign content is unavailable.</p>;
 const qrUrl=qr?.identity===identity?qr.url:null;
 if(qrConfig.enabled&&!qrUrl)return <p role={qrError||!qrEvent?.slug?'alert':'status'}>The saved sign QR reference {qrError||!qrEvent?.slug?'cannot yet be verified.':'is being verified…'} No incomplete document is shown.</p>;
 if(background&&!uploaded&&!trustedGallery)return <p role="alert">The saved sign artwork requires verified read-only media access. No incomplete preview or PDF is shown.</p>;
 if(uploaded&&!media.url)return <p role={media.error?'alert':'status'}>{media.error?'The saved sign artwork could not be verified.':'Checking verified read-only access to the saved sign artwork…'} No incomplete preview or PDF is shown.</p>;
 const settings:InvitationCardSettings={id:row.id,user_id:ownerId,event_id:eventId,name:'QR Seating Sign',card_type:'invitation',card_size:'A4',
  orientation:row.orientation,background_color:row.background_color,background_image_type:row.background_image_type,background_image_url:uploaded?media.url:background,
  background_image_x_position:row.background_image_x_position,background_image_y_position:row.background_image_y_position,
  background_image_opacity:row.background_image_opacity,text_zones:resolveWeddingFontZones(row.text_zones),font_color:'#000000',qr_config:qrConfig};
 const dimensions=SIGNAGE_PRINT_DIMENSIONS[paper];
 const download=async()=>{if(!ref.current||busy)return;setBusy(true);setError(false);try{
  const {exportSignagePDF}=await import('@/lib/signagePdfExporter');const landscape=settings.orientation==='landscape';
  await exportSignagePDF({pageElement:ref.current,widthMm:landscape?dimensions.heightMm:dimensions.widthMm,heightMm:landscape?dimensions.widthMm:dimensions.heightMm},`WW-Sign-${event.name}-${paper.toUpperCase()}-${landscape?'Landscape':'Portrait'}.pdf`);
 }catch{setError(true);}finally{setBusy(false);}};
 return <section aria-label="Read-only saved Seating Chart Sign">
  <p>Viewing the saved design at {paper.toUpperCase()}. A1 is the standard opening size; the customer's last session-only print-size selection was not retained.</p>
  <label>Viewing and export size<select value={paper} disabled={busy} onChange={e=>setPaper(e.target.value)}>{Object.keys(SIGNAGE_PRINT_DIMENSIONS).map(id=><option key={id} value={id}>{id.toUpperCase()}</option>)}</select></label>
  <button disabled={busy} onClick={()=>void download()}>Download sign PDF</button>
  {error&&<p role="alert">The saved sign PDF could not be verified. No customer changes were made.</p>}
  <InvitationCardPreview settings={settings} eventData={signageEventDataFromEvent(event)} paperSize={dimensions} documentId="seating-chart-sign"
   documentRef={ref} backgroundFit="cover" qrDataUrl={qrUrl} fitToContainer normaliseQrControls qrWhitePlate/>
 </section>;
}
