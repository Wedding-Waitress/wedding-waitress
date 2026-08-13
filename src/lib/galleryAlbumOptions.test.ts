import { describe, expect, it } from 'vitest';
import { MANAGEABLE_GALLERY_ALBUMS, normaliseGalleryAlbum } from './galleryAlbumOptions';

describe('gallery album options', () => {
  it('exposes only the simplified guest and management choices', () => {
    expect(MANAGEABLE_GALLERY_ALBUMS).toEqual(['Ceremony', 'Reception', 'Other']);
  });

  it.each([
    [null, 'Other'],
    [undefined, 'Other'],
    ['', 'Other'],
    ['Dance Floor', 'Other'],
    ['Speeches', 'Other'],
    ['Bridal Party', 'Other'],
    ['unexpected', 'Other'],
    ['Ceremony', 'Ceremony'],
    ['Reception', 'Reception'],
    ['Other', 'Other'],
  ])('normalises %s to %s', (input, expected) => {
    expect(normaliseGalleryAlbum(input)).toBe(expected);
  });
});
