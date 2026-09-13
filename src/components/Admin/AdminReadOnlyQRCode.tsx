import {useEffect,useRef,useState} from 'react';
import {Card,CardContent,CardHeader,CardTitle} from '@/components/ui/card';
import {AdvancedQRGenerator} from '@/lib/advancedQRGenerator';
import {buildDynamicQRUrl} from '@/lib/urlUtils';
import {qrPreviewSettings} from '@/lib/qrPreviewSettings';
import {createCustomerQrJPG,createCustomerQrSVG,createCustomerQrPDF,printCustomerQr} from '@/lib/qrCustomerExports';
import {useAdminPreviewMedia} from '@/hooks/useAdminPreviewMedia';
import styles from '@/components/Dashboard/QRCode/QRCodeSeatingChart.module.css';
function savedDesign(value:unknown,ownerId:string,eventId:string){
 if(!value||typeof value!=='object')return null;const row=value as Record<string,any>;
 if(row.user_id!==ownerId||row.event_id!==eventId
  ||!['background_color','foreground_color','dots_color','marker_border_color','marker_center_color'].every(key=>typeof row[key]==='string'&&/^#[0-9a-f]{6}$/i.test(row[key]))
  ||!['square','rounded','circle','diamond','plus','vertical','horizontal'].includes(row.dots_shape)
  ||!['square','rounded','circle'].includes(row.marker_border_shape)||!['square','circle'].includes(row.marker_center_shape)
  ||!(row.center_image_url===null||typeof row.center_image_url==='string')||!Number.isFinite(row.center_image_size)||row.center_image_size<0||row.center_image_size>100)return null;
 return row;
}
export function AdminReadOnlyQRCode({ownerId,eventId,eventName,settings,dynamicRecord}:{ownerId:string;eventId:string;eventName:string;settings:unknown;dynamicRecord:unknown}){
 const row=savedDesign(settings,ownerId,eventId),record=dynamicRecord as Record<string,any>|null;
 const verifiedRecord=record&&record.user_id===ownerId&&record.current_event_id===eventId&&record.is_active===true&&record.destination_type==='guest_lookup'
  &&typeof record.code==='string'&&/^[A-Za-z0-9_-]{1,200}$/.test(record.code);
 let uploadedLogo=false;
 if(row?.center_image_url)try{const source=new URL(row.center_image_url);uploadedLogo=source.origin===new URL(import.meta.env.VITE_SUPABASE_URL).origin
  &&source.pathname.startsWith('/storage/v1/object/public/qr-assets/')&&!source.search&&!source.hash;}catch{}
 const media=useAdminPreviewMedia(ownerId,eventId,'qr_logo',row?.id,!!verifiedRecord&&uploadedLogo,row?.center_image_url??undefined);
 const identity=JSON.stringify([ownerId,eventId,row,verifiedRecord?record.code:null,media.url]);
 const currentIdentity=useRef(identity);currentIdentity.current=identity;
 useEffect(()=>()=>{currentIdentity.current='';},[]);
 const [generated,setGenerated]=useState<{identity:string;url:string}|null>(null),[failed,setFailed]=useState(false),[exportError,setExportError]=useState<string|null>(null);
 useEffect(()=>{let current=true;setGenerated(null);setFailed(false);if(!row||!verifiedRecord||row.center_image_url&&!media.url)return;
  const deadline=setTimeout(()=>{if(current){current=false;setFailed(true);}},10000);
  const colors={background:row.background_color,foreground:row.foreground_color,dotsColor:row.dots_color,markerBorderColor:row.marker_border_color,markerCenterColor:row.marker_center_color};
  void (async()=>new AdvancedQRGenerator(512,true,true).generate(buildDynamicQRUrl(record.code),qrPreviewSettings(eventId,colors,{dotsShape:row.dots_shape,markerBorderShape:row.marker_border_shape,markerCenterShape:row.marker_center_shape},{url:row.center_image_url?media.url:null,size:row.center_image_size})))()
   .then(url=>{clearTimeout(deadline);if(current&&typeof url==='string'&&url.startsWith('data:image/'))setGenerated({identity,url});else if(current)setFailed(true);})
   .catch(()=>{clearTimeout(deadline);if(current)setFailed(true);});return()=>{current=false;clearTimeout(deadline);};
 },[identity]);
 if(!row)return <p>Complete saved QR design is unavailable. A default customer QR has not been substituted.</p>;
 if(!verifiedRecord)return <p role="alert">The saved active QR destination cannot be verified. No QR code or private link has been created.</p>;
 if(row.center_image_url&&!uploadedLogo)return <p role="alert">The saved QR logo requires verified read-only artwork access. No incomplete QR is shown.</p>;
 if(uploadedLogo&&!media.url)return <p role={media.error?'alert':'status'}>{media.error?'The saved QR logo could not be verified.':'Checking verified read-only access to the saved QR logo…'} No incomplete QR is shown.</p>;
 const url=generated?.identity===identity?generated.url:null;
 const downloadPng=()=>{if(!url)return;const link=document.createElement('a');link.href=url;link.download=`qr-code-${eventName.replace(/[^\p{L}\p{N} ._-]/gu,'').slice(0,120)||'event'}.png`;link.click();};
 const downloadImage=async(format:'jpg'|'svg')=>{if(!url)return;const exportIdentity=identity;setExportError(null);try{
  const data=format==='jpg'?await createCustomerQrJPG(url):await createCustomerQrSVG(url);if(currentIdentity.current!==exportIdentity)return;
  const objectUrl=data instanceof Blob?URL.createObjectURL(data):null;try{const link=document.createElement('a');link.href=objectUrl??data as string;link.download=`qr-code-${eventName.replace(/[^\p{L}\p{N} ._-]/gu,'').slice(0,120)||'event'}.${format}`;link.click();}finally{if(objectUrl)URL.revokeObjectURL(objectUrl);}
 }catch{if(currentIdentity.current===exportIdentity)setExportError(`The saved QR ${format.toUpperCase()} could not be exported.`);}};
 return <Card className={styles.eventPanel}><CardHeader><CardTitle>QR Code Seating Chart — {eventName}</CardTitle></CardHeader><CardContent>
  {url?<div className={`${styles.qrFrame} bg-white rounded-lg border border-primary p-4 flex items-center justify-center min-h-[320px]`}>
   <div className={`${styles.qrPreview} w-full max-w-[280px] aspect-square flex items-center justify-center`}><img src={url} alt="QR Code Preview" className="w-full h-full" style={{imageRendering:'pixelated'}}/></div>
  </div>:<p role={failed?'alert':'status'}>{failed?'The saved QR could not be rendered.':'Rendering the saved QR…'}</p>}
  <section className={`${styles.designerPanel} rounded-lg p-3 space-y-3`} aria-label="Read-only saved QR customization"><h3>Design Your QR Code — saved settings</h3>
   <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{[['Background','background_color'],['Foreground','foreground_color'],['Dots','dots_color'],['Marker Border','marker_border_color'],['Marker Center','marker_center_color']].map(([label,key])=><label key={key} className="flex items-center justify-between gap-2">{label}<input aria-label={`Saved QR ${label} colour`} type="color" value={row[key]} disabled/></label>)}</div>
   <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">{[['Dots','dots_shape'],['Marker Border','marker_border_shape'],['Marker Center','marker_center_shape']].map(([label,key])=><label key={key}>{label} shape<input aria-label={`Saved QR ${label} shape`} value={row[key]} readOnly className="block w-full min-w-0"/></label>)}</div>
   <p>Logo: {row.center_image_url?'Verified saved artwork':'No saved logo'}. Saved logo size: {row.center_image_size}%.</p>
  </section><button disabled={!url} onClick={downloadPng}>Download PNG</button>
  <button disabled={!url} onClick={()=>void downloadImage('jpg')}>Download JPG</button><button disabled={!url} onClick={()=>void downloadImage('svg')}>Download SVG</button>
  <button disabled={!url} onClick={()=>{if(!url)return;const exportIdentity=identity;setExportError(null);void createCustomerQrPDF(url).then(async pdf=>{const {savePdfAsync}=await import('@/lib/pdfExportUtils');if(currentIdentity.current!==exportIdentity)return;await savePdfAsync(pdf,`qr-code-${eventName.replace(/[^\p{L}\p{N} ._-]/gu,'').slice(0,120)||'event'}.pdf`);}).catch(()=>{if(currentIdentity.current===exportIdentity)setExportError('The saved QR PDF could not be exported.');});}}>Download QR PDF</button>
  <button disabled={!url} onClick={()=>{if(!url)return;setExportError(null);try{printCustomerQr(url,eventName||'Event');}catch{setExportError('The saved QR could not be sent to the print window.');}}}>Print QR</button>
  {exportError&&<p role="alert">{exportError}</p>}
  <p>Read-only saved design using the existing QR generator. No reset, upload, save, publish or destination change is enabled. Print preserves the customer heading layout; PDF preserves the customer A4 layout with a centred 100 mm QR. These existing outputs differ and are not preview/PDF mirror parity.</p>
 </CardContent></Card>;
}
