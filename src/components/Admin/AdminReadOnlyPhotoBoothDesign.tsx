import {PhotoBoothTemplatePreview} from '@/components/Dashboard/PhotoVideoGallery/PhotoBoothTemplatePreview';
import {Card} from '@/components/ui/card';
import {useAdminPreviewMedia} from '@/hooks/useAdminPreviewMedia';
import {resolveStripStyle,formatEventDate,type ComposeOpts} from '@/lib/photoBoothTemplate';
import {resolvePhotoBoothTemplateSelection,PHOTO_BOOTH_BACKGROUND_TEMPLATES} from '@/lib/photoBoothBackgroundTemplates';
import styles from '@/components/Dashboard/PhotoVideoGallery/photoVideoSharingManagement.module.css';
function validStyle(value:unknown){
 if(value===null)return true;if(!value||typeof value!=='object'||Array.isArray(value))return false;
 const row=value as Record<string,unknown>;
 return ['bgColor','fontColor','nameColor','dateColor'].every(key=>row[key]===undefined||row[key]===null||typeof row[key]==='string'&&/^#[0-9a-f]{6}$/i.test(row[key] as string))
  &&['fontFamily','nameFontFamily','dateFontFamily','templateId'].every(key=>row[key]===undefined||row[key]===null||typeof row[key]==='string'&&(row[key] as string).length<=200)
  &&['nameSize','dateSize'].every(key=>row[key]===undefined||row[key]===null||typeof row[key]==='number'&&Number.isFinite(row[key])&&Number(row[key])>0&&Number(row[key])<=300)
  &&[undefined,null,'none','white','black'].includes(row.textBackdrop as any)&&[undefined,'colour','template'].includes(row.backgroundMode as any);
}
export function AdminReadOnlyPhotoBoothDesign({ownerId,eventId,eventName,eventDate,gallery}:{ownerId:string;eventId:string;eventName:string;eventDate:string|null;gallery:unknown}){
 const row=gallery as Record<string,any>|null,nullable=(value:unknown)=>value===null||typeof value==='string';
 const complete=!!row&&row.user_id===ownerId&&row.event_id===eventId&&typeof row.id==='string'
  &&typeof row.show_branding==='boolean'&&typeof row.photo_booth_enabled==='boolean'&&['single','strip'].includes(row.photo_booth_mode)
  &&['gallery_title','photo_booth_strip_bottom_text','photo_booth_strip_logo_url','photo_booth_strip_template_url'].every(key=>key in row&&nullable(row[key]))&&'photo_booth_strip_style' in row&&validStyle(row.photo_booth_strip_style);
 const template=complete?resolvePhotoBoothTemplateSelection(row.photo_booth_strip_template_url,row.photo_booth_strip_style?.templateId):null;
 let builtin=false;
 if(template){builtin=PHOTO_BOOTH_BACKGROUND_TEMPLATES.some(item=>item.url===template);if(!builtin)try{const parsed=new URL(template);builtin=parsed.origin===window.location.origin&&!parsed.search&&!parsed.hash&&PHOTO_BOOTH_BACKGROUND_TEMPLATES.some(item=>item.url===parsed.pathname);}catch{}}
 const logo=useAdminPreviewMedia(ownerId,eventId,'booth_strip_logo',complete?row.id:undefined,complete&&!!row.photo_booth_strip_logo_url,row?.photo_booth_strip_logo_url);
 const artwork=useAdminPreviewMedia(ownerId,eventId,'booth_strip_template',complete?row.id:undefined,complete&&!!template&&!builtin,template??undefined);
 if(!complete)return <p>Complete saved Photo Booth design is unavailable. No customer design has been substituted.</p>;
 if(!template&&(row.photo_booth_strip_template_url||row.photo_booth_strip_style?.backgroundMode==='template'))return <p role="alert">The saved Photo Booth template is unavailable. No substitute background is shown.</p>;
 if(row.photo_booth_strip_logo_url&&!logo.url||template&&!builtin&&!artwork.url)return <p role={logo.error||artwork.error?'alert':'status'}>{logo.error||artwork.error?'The saved Photo Booth artwork could not be verified.':'Checking verified read-only access to the saved Photo Booth artwork…'} No incomplete design is shown.</p>;
 const style=resolveStripStyle(row.photo_booth_strip_style),opts:ComposeOpts={title:eventName.trim(),dateText:formatEventDate(eventDate),hashtag:row.gallery_title?.startsWith('#')?row.gallery_title:undefined,bottomText:row.photo_booth_strip_bottom_text?.trim()?row.photo_booth_strip_bottom_text:null,logoUrl:row.photo_booth_strip_logo_url?logo.url:null,templateUrl:template?(builtin?template:artwork.url):null,backgroundMode:template?'template':'colour',templateId:row.photo_booth_strip_style?.templateId??null,showBranding:row.show_branding,style,strictAssets:true};
 return <Card className={`p-5 space-y-4 ${styles.glassCard}`} aria-label="Read-only saved Photo Booth design"><h2 className="text-xl font-bold">Saved Photo Strip Design</h2>
  <p>Recorded Photo Booth: {row.photo_booth_enabled?'Enabled':'Disabled'}; capture mode: {row.photo_booth_mode}. Individual photos remain raw originals; this is the saved strip design preview.</p>
  {row.photo_booth_strip_style===null&&<p>No custom strip style is saved. The existing renderer’s normal default style is shown.</p>}
  <p>Footer: {row.photo_booth_strip_logo_url?'Saved custom footer artwork':row.photo_booth_strip_bottom_text?.trim()||'Existing event name and date footer'}.</p>
  <PhotoBoothTemplatePreview key={JSON.stringify([ownerId,eventId,opts])} kind="strip" opts={opts} timeoutMs={10000}/>
  <p>Read-only saved design with placeholder photos, using the existing compositor. Camera, upload, editing, reset and save actions are unavailable.</p>
 </Card>;
}
