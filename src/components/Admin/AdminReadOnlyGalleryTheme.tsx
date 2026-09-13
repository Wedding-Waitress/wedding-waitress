import {useState} from 'react';
import {Card} from '@/components/ui/card';
import {Switch} from '@/components/ui/switch';
import {useAdminPreviewMedia} from '@/hooks/useAdminPreviewMedia';
import {resolveGalleryTheme} from '@/lib/galleryTheme';
import {GALLERY_BACKGROUND_PRESETS} from '@/lib/galleryBackgroundLibrary';
import styles from '@/components/Dashboard/PhotoVideoGallery/photoVideoSharingManagement.module.css';
export function AdminReadOnlyGalleryTheme({ownerId,eventId,eventName,gallery}:{ownerId:string;eventId:string;eventName:string;gallery:unknown}){
 const row=gallery as Record<string,any>|null;
 const nullableText=(value:unknown)=>value===null||typeof value==='string';
 const complete=row&&row.user_id===ownerId&&row.event_id===eventId&&typeof row.id==='string'&&['light','dark','cream'].includes(row.background_style)&&['preset','color','image'].includes(row.background_mode)&&typeof row.show_branding==='boolean'
  &&['background_color','background_image_url','cover_image_url','logo_image_url','theme_color'].every(key=>key in row&&nullableText(row[key]))
  &&(row.background_color===null||/^#[0-9a-f]{6}$/i.test(row.background_color));
 let preset:string|null=null;
 if(complete&&typeof row.background_image_url==='string'){
  if(GALLERY_BACKGROUND_PRESETS.some(item=>item.url===row.background_image_url))preset=row.background_image_url;
  else try{const url=new URL(row.background_image_url);if(url.origin===window.location.origin&&!url.search&&!url.hash&&GALLERY_BACKGROUND_PRESETS.some(item=>item.url===url.pathname))preset=url.pathname;}catch{}
 }
 const cover=useAdminPreviewMedia(ownerId,eventId,'gallery_cover',complete?row.id:undefined,Boolean(complete&&row.cover_image_url),row?.cover_image_url);
 const logo=useAdminPreviewMedia(ownerId,eventId,'gallery_logo',complete?row.id:undefined,Boolean(complete&&row.logo_image_url),row?.logo_image_url);
 const background=useAdminPreviewMedia(ownerId,eventId,'gallery_background',complete?row.id:undefined,Boolean(complete&&row.background_mode==='image'&&row.background_image_url&&!preset),row?.background_image_url);
 const [failedIdentity,setFailedIdentity]=useState<string|null>(null);
 const identity=JSON.stringify([ownerId,eventId,row,cover.url,logo.url,background.url,preset]);
 if(!complete)return <p>Complete saved gallery theme is unavailable. No customer background or branding choice has been inferred.</p>;
 if(row.background_mode==='color'&&!row.background_color||row.background_mode==='image'&&!row.background_image_url)return <p role="alert">The recorded gallery background is incomplete. No substitute theme is shown.</p>;
 if(row.cover_image_url&&!cover.url||row.logo_image_url&&!logo.url||row.background_mode==='image'&&!preset&&!background.url)return <p role={cover.error||logo.error||background.error?'alert':'status'}>Saved gallery theme artwork is awaiting verified read-only access. No incomplete theme preview is shown.</p>;
 if(failedIdentity===identity)return <p role="alert">Saved gallery artwork failed to load. No incomplete or substituted theme is shown.</p>;
 const theme=resolveGalleryTheme({...row,cover_image_url:cover.url,logo_image_url:logo.url,background_image_url:preset??background.url});
 return <Card className={`p-5 my-4 space-y-3 ${styles.glassCard}`} aria-label="Read-only saved gallery theme"><h3>Saved guest-gallery theme</h3><p>Background mode: {row.background_mode}; preset: {row.background_style}; recorded background colour: {row.background_color??'Not recorded'}.</p><label className="flex gap-2 items-center">Saved Wedding Waitress branding <Switch aria-label="Saved gallery branding" checked={row.show_branding} disabled/></label>
  <p>The accent remains the existing fixed Wedding Waitress gold. The legacy theme-colour field is not used to invent a custom accent.</p>
  <div className={`${theme.bgClass} ${theme.textClass} rounded-xl p-5 min-h-40`} style={theme.pageStyle} aria-label="Saved gallery theme preview">
   {row.background_mode==='image'&&(preset??background.url)&&<img src={preset??background.url!} alt="" aria-hidden="true" style={{display:'none'}} onError={()=>setFailedIdentity(identity)}/>}
   {cover.url&&<img src={cover.url} alt="Saved gallery cover" className="w-full h-32 object-cover rounded-lg" onError={()=>setFailedIdentity(identity)}/>} {logo.url&&<img src={logo.url} alt="Saved gallery logo" className="h-16 object-contain" onError={()=>setFailedIdentity(identity)}/>}<h4>{eventName}</h4><p className={theme.mutedClass}>Read-only saved guest-gallery presentation</p>
  </div><p>Read-only. Upload, replace, delete, reset, save and customer access links are unavailable.</p>
 </Card>;
}
