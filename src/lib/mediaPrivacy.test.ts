import {describe,it,expect} from 'vitest';import {categoryOf,isPublicGalleryMedia,guestVisibleItems,publicGalleryItems} from './mediaPrivacy';
describe('shared gallery categories',()=>{
 const items=[{id:'photo',kind:'photo',source_category:'guest_upload'},{id:'booth',kind:'photo',source_category:'photo_booth'},{id:'audio',kind:'audio',source_category:'guestbook_recording'},{id:'video',kind:'video',source_category:'guestbook_recording'},{id:'text',kind:'photo',source_category:'guestbook_text'}].map(i=>({...i,moderation_status:'approved'}));
 it('includes all guest memory types',()=>{expect(publicGalleryItems(items)).toEqual(items);expect(guestVisibleItems(items)).toEqual(items);});
 it('keeps hidden submissions out of guest views',()=>{expect(guestVisibleItems(items.map(i=>({...i,moderation_status:'hidden'})))).toEqual([]);});
 it('retains category identity and separate Video Wishes rules',()=>{expect(categoryOf({kind:'audio',is_guestbook:true})).toBe('guestbook_recording');expect(isPublicGalleryMedia({kind:'video',source_category:'video_wishes'})).toBe(false);expect(isPublicGalleryMedia({kind:'audio',source_category:'guest_upload'})).toBe(false);});
 it('keeps event filtering independent',()=>{const rows=[...items.map(i=>({...i,event_id:'one'})),{...items[0],event_id:'two'}];expect(guestVisibleItems(rows.filter(i=>i.event_id==='one'))).toHaveLength(5);});
});