import { describe, expect, it } from 'vitest';
import {
  PHOTO_BOOTH_BACKGROUND_TEMPLATES,
  PHOTO_BOOTH_TEMPLATE_CATEGORIES,
  PHOTO_BOOTH_TEMPLATE_COLOURS,
  filterPhotoBoothBackgroundTemplates,
  filterPhotoBoothTemplates,
  normalisePhotoBoothTemplateUrl,
  resolvePhotoBoothTemplateSelection,
} from './photoBoothBackgroundTemplates';
import {
  isPhotoBoothJpeg,
  PHOTO_BOOTH_JPEG_ACCEPT,
  PHOTO_BOOTH_JPEG_ERROR,
} from './photoBoothAssetValidation';
import {
  FOOTER_PANEL_HEIGHT,
  FOOTER_PANEL_WIDTH,
  PB_STRIP_PRINT,
  validateFooterPanelSize,
  validateMasterTemplateSize,
} from './photoBoothTemplate';

const removedBuiltInUrls = [
  '/photobooth-templates/Classic%20Champagne.jpg',
  '/photobooth-templates/Blush%20Rose.jpg',
  '/photobooth-templates/Sage%20Botanical.jpg',
  '/photobooth-templates/Dusty%20Blue%20Pearl.jpg',
  '/photobooth-templates/Lavender%20Elegance.jpg',
  '/photobooth-templates/Terracotta%20Romance.jpg',
  '/photobooth-templates/Burgundy%20and%20Antique%20Gold.jpg',
  '/photobooth-templates/Midnight%20Navy%20and%20Gold.jpg',
  '/photobooth-templates/Black%20and%20White%20Luxe.jpg',
  '/photobooth-templates/Emerald%20Garden.jpg',
  '/photobooth-templates/Pearl%20Silver.jpg',
  '/photobooth-templates/Wedding%20Waitress%20Espresso%20and%20Gold.jpg',
] as const;

describe('Digital Photo Booth built-in template library', () => {
  it('keeps imported catalogue metadata unique, sorted and filterable at any catalogue size', () => {
    expect(new Set(PHOTO_BOOTH_BACKGROUND_TEMPLATES.map((template) => template.id)).size).toBe(
      PHOTO_BOOTH_BACKGROUND_TEMPLATES.length,
    );
    expect(new Set(PHOTO_BOOTH_BACKGROUND_TEMPLATES.map((template) => template.sourceFilename.toLowerCase())).size).toBe(
      PHOTO_BOOTH_BACKGROUND_TEMPLATES.length,
    );
    expect(PHOTO_BOOTH_TEMPLATE_CATEGORIES).toEqual([...PHOTO_BOOTH_TEMPLATE_CATEGORIES].sort());
    expect(PHOTO_BOOTH_TEMPLATE_COLOURS).toEqual([...PHOTO_BOOTH_TEMPLATE_COLOURS].sort());
    expect(filterPhotoBoothBackgroundTemplates('', 'all', 'all')).toEqual(PHOTO_BOOTH_BACKGROUND_TEMPLATES);
    PHOTO_BOOTH_BACKGROUND_TEMPLATES.forEach((template) => {
      expect(filterPhotoBoothBackgroundTemplates(template.name, template.category, template.colour)).toContainEqual(template);
      expect(template.url).toContain('/photobooth-templates/originals/');
      expect(template.thumbUrl).toContain('/photobooth-templates/thumbnails/');
    });
  });

  it('searches and filters a 96-template catalogue without loading original assets', () => {
    const templates = Array.from({ length: 96 }, (_, index) => {
      const number = String(index + 1).padStart(3, '0');
      const colour = index < 48 ? 'Blue' : 'Pink';
      const category = index % 2 === 0 ? 'Classic' : 'General';
      return {
        id: `photo-strip-${colour.toLowerCase()}-${number}`,
        name: `${colour} ${number}`,
        category,
        colour,
        url: `/photobooth-templates/originals/${colour}-${number}.jpg`,
        thumbUrl: `/photobooth-templates/thumbnails/${colour}-${number}-thumb.jpg`,
        sourceFilename: `${colour} ${number}.jpg`,
      };
    });

    expect(filterPhotoBoothTemplates(templates, 'blue 010', 'all', 'all')).toHaveLength(1);
    expect(filterPhotoBoothTemplates(templates, '', 'all', 'Pink')).toHaveLength(48);
    expect(filterPhotoBoothTemplates(templates, '', 'Classic', 'Blue')).toHaveLength(24);
  });

  it('accepts only JPEG customisation artwork and retains both required geometries', () => {
    expect(PHOTO_BOOTH_JPEG_ACCEPT).toBe('image/jpeg,.jpg,.jpeg');
    expect(PHOTO_BOOTH_JPEG_ERROR).toBe('Please upload a JPEG file (.jpg or .jpeg).');
    expect(isPhotoBoothJpeg({ name: 'design.jpg', type: 'image/jpeg' })).toBe(true);
    expect(isPhotoBoothJpeg({ name: 'design.JPEG', type: 'image/jpeg' })).toBe(true);
    expect(isPhotoBoothJpeg({ name: 'design.png', type: 'image/png' })).toBe(false);
    expect(isPhotoBoothJpeg({ name: 'design.webp', type: 'image/webp' })).toBe(false);
    expect(isPhotoBoothJpeg({ name: 'design.jpg', type: 'image/png' })).toBe(false);
    expect(PB_STRIP_PRINT).toEqual({ w: 1200, h: 1800 });
    expect(validateMasterTemplateSize(1200, 1800).ok).toBe(true);
    expect([FOOTER_PANEL_WIDTH, FOOTER_PANEL_HEIGHT]).toEqual([600, 256]);
    expect(validateFooterPanelSize(600, 256).ok).toBe(true);
  });

  it('falls back every removed built-in URL while preserving organiser-uploaded templates', () => {
    removedBuiltInUrls.forEach((url) => expect(normalisePhotoBoothTemplateUrl(url)).toBeNull());
    expect(normalisePhotoBoothTemplateUrl('https://site.test/photobooth-templates/soft-floral.jpg')).toBeNull();
    expect(normalisePhotoBoothTemplateUrl('https://storage.test/event/custom-template.jpg')).toBe('https://storage.test/event/custom-template.jpg');
  });

  it('does not revive removed stable identities and leaves custom JPEG URLs intact', () => {
    expect(resolvePhotoBoothTemplateSelection('/photobooth-templates/retired.jpg', 'definitely-missing-template')).toBeNull();
    expect(resolvePhotoBoothTemplateSelection('https://storage.test/event/custom-template.jpg', null)).toBe(
      'https://storage.test/event/custom-template.jpg',
    );
    expect(resolvePhotoBoothTemplateSelection('/photobooth-templates/retired.jpg', 'missing-template')).toBeNull();
  });
});
