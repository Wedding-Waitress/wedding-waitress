import { describe, expect, it } from 'vitest';
import {
  assertPhotoBoothTemplateDimensions,
  detectPhotoBoothTemplateColour,
  isAcceptedPhotoBoothTemplateFile,
  naturalPhotoBoothTemplateCompare,
  photoBoothTemplateName,
} from './photoBoothTemplateAdmin';

describe('photo booth managed-template validation and metadata', () => {
  it('accepts only the supported JPG, JPEG and PNG filename/MIME combinations', () => {
    expect(isAcceptedPhotoBoothTemplateFile({ name: 'Design 1.jpg', type: 'image/jpeg' })).toBe(true);
    expect(isAcceptedPhotoBoothTemplateFile({ name: 'Design 2.jpeg', type: 'image/jpeg' })).toBe(true);
    expect(isAcceptedPhotoBoothTemplateFile({ name: 'Design 3.png', type: 'image/png' })).toBe(true);
    expect(isAcceptedPhotoBoothTemplateFile({ name: 'Design.webp', type: 'image/webp' })).toBe(false);
    expect(isAcceptedPhotoBoothTemplateFile({ name: 'Design.jpg', type: 'image/png' })).toBe(false);
  });

  it('requires exact 1200 x 1800 dimensions and reports the invalid dimensions', () => {
    expect(() => assertPhotoBoothTemplateDimensions(1200, 1800)).not.toThrow();
    expect(() => assertPhotoBoothTemplateDimensions(1199, 1800)).toThrow('1199 x 1800; expected exactly 1200 x 1800 px.');
    expect(() => assertPhotoBoothTemplateDimensions(1200, 1799)).toThrow('1200 x 1799; expected exactly 1200 x 1800 px.');
  });

  it('uses the filename stem, prior importer colour rules, and natural numeric ordering', () => {
    expect(photoBoothTemplateName('Wedding 12 - Rose Gold.jpeg')).toBe('Wedding 12 - Rose Gold');
    expect(detectPhotoBoothTemplateColour('Wedding 12 - Rose Gold')).toBe('Rose Gold');
    expect(detectPhotoBoothTemplateColour('Wedding 4 - Black and White')).toBe('Black and White');
    expect(detectPhotoBoothTemplateColour('Wedding 9')).toBe('Multicolour');
    expect([{ name: 'Wedding 10' }, { name: 'Wedding 2' }, { name: 'Wedding 1' }].sort(naturalPhotoBoothTemplateCompare).map((item) => item.name))
      .toEqual(['Wedding 1', 'Wedding 2', 'Wedding 10']);
  });
});
