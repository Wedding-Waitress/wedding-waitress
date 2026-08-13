export const MANAGEABLE_GALLERY_ALBUMS = [
  'Ceremony',
  'Reception',
  'Other',
] as const;

export type ManageableGalleryAlbum = (typeof MANAGEABLE_GALLERY_ALBUMS)[number];

/**
 * Keeps legacy, missing and unrecognised album values out of the simplified
 * upload and management controls without losing the underlying media item.
 */
export function normaliseGalleryAlbum(album: unknown): ManageableGalleryAlbum {
  return album === 'Ceremony' || album === 'Reception' ? album : 'Other';
}
