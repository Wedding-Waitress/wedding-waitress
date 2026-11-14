import { describe, expect, it } from 'vitest';
import { applySlideshowSettings, slideshowSettingsFromRow } from './slideshowSettings';

describe('Live Slideshow album compatibility', () => {
  it('normalises retired and missing album values to Other without dropping media', () => {
    expect(slideshowSettingsFromRow({
      slideshow_include_photos: true,
      slideshow_include_videos: true,
      slideshow_albums: ['Dance Floor', 'Speeches', 'Bridal Party', 'Ceremony', 'Other'],
    }).albums).toEqual(['Other', 'Ceremony']);

    const items = [
      { id: 'ceremony', kind: 'photo' as const, album: 'Ceremony', uploaded_at: '2026-01-01' },
      { id: 'dance', kind: 'photo' as const, album: 'Dance Floor', uploaded_at: '2026-01-02' },
      { id: 'speech', kind: 'video' as const, album: 'Speeches', uploaded_at: '2026-01-03' },
      { id: 'bridal', kind: 'photo' as const, album: 'Bridal Party', uploaded_at: '2026-01-04' },
      { id: 'missing', kind: 'photo' as const, album: null, uploaded_at: '2026-01-05' },
    ];

    const visible = applySlideshowSettings(items, {
      include_photos: true,
      include_videos: true,
      albums: ['Other'],
      order: 'oldest',
      slide_duration_sec: 5,
      transition: 'fade',
      show_caption: true,
      loop: true,
    });

    expect(visible.map((item) => item.id)).toEqual(['dance', 'speech', 'bridal', 'missing']);
  });
});

import {automaticSharedMemorySettings} from './slideshowSettings';
import {guestVisibleItems} from './mediaPrivacy';
it('automatically includes every shared memory despite stale album and media exclusions, preserving hidden/private content and playback',()=>{
 const saved={include_photos:false,include_videos:false,albums:['Ceremony'],order:'oldest' as const,slide_duration_sec:8,transition:'slide' as const,show_caption:false,loop:false};
 const snapshot=JSON.stringify(saved),effective=automaticSharedMemorySettings(saved);
 const items=[{id:'photo',kind:'photo',source_category:'guest_upload',album:'Reception'}, {id:'video',kind:'video',source_category:'guest_upload',album:'Other'}, {id:'booth-strip',kind:'photo',source_category:'photo_booth',album:null}, {id:'written',kind:'photo',source_category:'guestbook_text',album:null}, {id:'audio',kind:'audio',source_category:'guestbook_recording',album:null}, {id:'guestbook-video',kind:'video',source_category:'guestbook_recording',album:null}, {id:'hidden',kind:'video',source_category:'guest_upload',moderation_status:'hidden',album:null}, {id:'private-wish',kind:'video',source_category:'video_wishes',album:null}];
 expect(applySlideshowSettings(guestVisibleItems(items),effective).map(i=>i.id)).toEqual(['photo','video','booth-strip','written','audio','guestbook-video']);
 expect(effective).toEqual({...saved,include_photos:true,include_videos:true,albums:[]});expect(JSON.stringify(saved)).toBe(snapshot);
});
