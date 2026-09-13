import {GallerySlideshowSettingsCard} from '@/components/Dashboard/PhotoVideoGallery/GallerySlideshowSettingsCard';
import type {GalleryMeta} from '@/hooks/useEventMediaGallery';
import {slideshowSettingsFromRow,SLIDE_DURATION_OPTIONS} from '@/lib/slideshowSettings';
import {MANAGEABLE_GALLERY_ALBUMS,normaliseGalleryAlbum} from '@/lib/galleryAlbumOptions';
import {AdminReadOnlySlideshowPlayback} from './AdminReadOnlySlideshowPlayback';
import {AdminReadOnlyGalleryTheme} from './AdminReadOnlyGalleryTheme';
export function AdminReadOnlySlideshow({ownerId,eventId,gallery,items,eventName}:{ownerId:string;eventId:string;gallery:unknown;items?:unknown;eventName?:string}){
 const row=gallery as Record<string,any>|null;
 const complete=!!row&&row.user_id===ownerId&&row.event_id===eventId
  &&['slideshow_enabled','slideshow_include_photos','slideshow_include_videos','slideshow_show_caption','slideshow_loop'].every(key=>typeof row[key]==='boolean')
  &&(row.slideshow_include_photos||row.slideshow_include_videos)
  &&['newest','oldest','shuffle'].includes(row.slideshow_order)&&['fade','slide','none'].includes(row.slideshow_transition)
  &&(SLIDE_DURATION_OPTIONS as readonly unknown[]).includes(row.slideshow_slide_duration_sec)
  &&Array.isArray(row.slideshow_albums)&&row.slideshow_albums.every((album:unknown)=>typeof album==='string'&&MANAGEABLE_GALLERY_ALBUMS.includes(normaliseGalleryAlbum(album)));
 if(!complete)return <p>Complete saved Live Slideshow configuration is unavailable. No default configuration or private access link has been substituted.</p>;
 return <section aria-label="Read-only saved Live Slideshow"><p>Recorded Live Slideshow: {row.slideshow_enabled?'Enabled':'Disabled'}. Read-only.</p>
  <GallerySlideshowSettingsCard meta={row as GalleryMeta} value={slideshowSettingsFromRow(row)} onChange={()=>{}} onSave={async()=>{}} appearance="espresso-glass" readOnly/>
  {eventName!==undefined&&<AdminReadOnlyGalleryTheme ownerId={ownerId} eventId={eventId} eventName={eventName} gallery={row}/>}
  {items!==undefined&&typeof row.id==='string'&&eventName!==undefined&&<AdminReadOnlySlideshowPlayback key={`${ownerId}:${eventId}`} ownerId={ownerId} eventId={eventId} eventName={eventName} galleryId={row.id} items={items} settings={slideshowSettingsFromRow(row)}/>}
  <p>The saved playback configuration is shown; the customer’s private venue display is not launched.</p></section>;
}
