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
