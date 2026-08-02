import { describe, it, expect } from 'vitest';
import { resolveGalleryTheme, DEFAULT_THEME_COLOR } from '@/lib/galleryTheme';
import { GALLERY_BACKGROUND_PRESETS, isGalleryBackgroundPreset } from '@/lib/galleryBackgroundLibrary';

describe('gallery theme background modes', () => {
  it('always uses Wedding Waitress gold, ignoring stored custom theme colours', () => {
    const t = resolveGalleryTheme({ theme_color: '#FF0000' });
    expect(t.themeColor).toBe(DEFAULT_THEME_COLOR);
  });

  it('defaults to the soft cream preset', () => {
    const t = resolveGalleryTheme(null);
    expect(t.bgMode).toBe('preset');
    expect(t.bgStyle).toBe('cream');
    expect(t.bgClass).toBe('bg-[#F8F5F0]');
    expect(t.pageStyle).toEqual({});
  });

  it('applies a custom background colour and derives readable text', () => {
    const light = resolveGalleryTheme({ background_mode: 'color', background_color: '#FFF3E0' });
    expect(light.bgMode).toBe('color');
    expect(light.pageStyle.backgroundColor).toBe('#FFF3E0');
    expect(light.isDark).toBe(false);

    const dark = resolveGalleryTheme({ background_mode: 'color', background_color: '#101010' });
    expect(dark.isDark).toBe(true);
    expect(dark.textClass).toBe('text-white');
  });

  it('applies background images with cover + centre and no distortion', () => {
    const t = resolveGalleryTheme({ background_mode: 'image', background_image_url: '/gallery-backgrounds/elegant-champagne-silk.svg' });
    expect(t.bgMode).toBe('image');
    expect(t.pageStyle.backgroundSize).toBe('cover');
    expect(t.pageStyle.backgroundPosition).toBe('center');
    expect(t.pageStyle.backgroundRepeat).toBe('no-repeat');
    expect(t.bgClass).toBe('');
  });

  it('falls back to the preset when the selected mode has no value', () => {
    expect(resolveGalleryTheme({ background_mode: 'image', background_image_url: null }).bgMode).toBe('preset');
    expect(resolveGalleryTheme({ background_mode: 'color', background_color: 'nope' }).bgMode).toBe('preset');
  });

  it('keeps cover image and logo independent of the background', () => {
    const t = resolveGalleryTheme({
      background_mode: 'image',
      background_image_url: '/gallery-backgrounds/floral-rose-garden.svg',
      cover_image_url: 'https://cdn/cover.jpg',
      logo_image_url: 'https://cdn/logo.png',
    });
    expect(t.coverImageUrl).toBe('https://cdn/cover.jpg');
    expect(t.logoImageUrl).toBe('https://cdn/logo.png');
    expect(t.bgImageUrl).toBe('/gallery-backgrounds/floral-rose-garden.svg');
  });
});

describe('background library', () => {
  it('ships 24 locally-stored presets across six categories', () => {
    expect(GALLERY_BACKGROUND_PRESETS).toHaveLength(24);
    expect(new Set(GALLERY_BACKGROUND_PRESETS.map(p => p.category)).size).toBe(6);
  });

  it('never hotlinks third-party URLs', () => {
    for (const p of GALLERY_BACKGROUND_PRESETS) {
      expect(p.url.startsWith('/gallery-backgrounds/')).toBe(true);
    }
  });

  it('recognises preset URLs', () => {
    expect(isGalleryBackgroundPreset(GALLERY_BACKGROUND_PRESETS[0].url)).toBe(true);
    expect(isGalleryBackgroundPreset('https://example.com/x.jpg')).toBe(false);
    expect(isGalleryBackgroundPreset(null)).toBe(false);
  });
});
