import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {isGeneralGalleryItem} from '../../supabase/functions/_shared/gallery-public-media';
import {guestbookMemoryPoster} from '../../supabase/functions/_shared/guestbook-memory-poster';
import {guestVisibleItems} from './mediaPrivacy';
import {applySlideshowSettings,DEFAULT_SLIDESHOW_SETTINGS} from './slideshowSettings';
describe('shared Guestbook memories',()=>{
 it.each(['audio','video'])('includes approved %s recordings and preserves moderation',kind=>{const item={id:'recording',kind,source_category:'guestbook_recording',is_guestbook:true,moderation_status:'approved'};expect(isGeneralGalleryItem(item)).toBe(true);expect(guestVisibleItems([item])).toEqual([item]);expect(applySlideshowSettings([item],DEFAULT_SLIDESHOW_SETTINGS)).toEqual([item]);expect(guestVisibleItems([{...item,moderation_status:'hidden'}])).toEqual([]);});
 it('still rejects unknown categories and unrelated audio',()=>{expect(isGeneralGalleryItem({kind:'audio',source_category:'guest_upload'})).toBe(false);expect(isGeneralGalleryItem({kind:'video',source_category:'unknown'})).toBe(false);});
 it('escapes written messages and names in the slideshow image',()=>{const svg=decodeURIComponent(guestbookMemoryPoster('<script>bad</script>','A & B').split(',')[1]);expect(svg).toContain('&lt;script&gt;');expect(svg).not.toContain('<script>');expect(svg).toContain('A &amp; B');});
 it('checks the password before reading or signing shared content',()=>{const edge=readFileSync('supabase/functions/gallery-live-feed/index.ts','utf8');expect(edge.indexOf("pwOk !== true")).toBeLessThan(edge.indexOf("rpc('get_event_media_items_public'"));expect(edge).toContain("rpc('get_guestbook_gallery_text'");expect(edge).toContain('guestbookMemoryPoster(row.message,row.uploader_name)');const sql=readFileSync('supabase/migrations/20261029124000_shared_gallery_guestbook_memories.sql','utf8');expect(sql).toContain("m.moderation_status='approved'");expect(sql).toContain('FROM PUBLIC,anon,authenticated');});
});