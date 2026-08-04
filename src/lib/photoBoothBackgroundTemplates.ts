// Built-in Wedding Waitress photo-strip background templates.
// Each template is a full 1440 x 2000 px vertical JPEG canvas that becomes the
// complete background of the generated photo strip. Add new entries here — the
// Photo Booth Customisation UI renders the library automatically.

export interface PhotoBoothBackgroundTemplate {
  id: string;
  name: string;
  /** Full-size 1440 x 2000 JPEG used for composition */
  url: string;
  /** Small preview image used in the picker */
  thumbUrl: string;
}

export const PHOTO_BOOTH_BACKGROUND_TEMPLATES: PhotoBoothBackgroundTemplate[] = [
  {
    id: 'classic-champagne',
    name: 'Classic Champagne',
    url: '/photobooth-templates/classic-champagne.jpg',
    thumbUrl: '/photobooth-templates/classic-champagne-thumb.jpg',
  },
  {
    id: 'soft-floral',
    name: 'Soft Floral',
    url: '/photobooth-templates/soft-floral.jpg',
    thumbUrl: '/photobooth-templates/soft-floral-thumb.jpg',
  },
];

/** True when the given template URL is one of the built-in library templates. */
export const isLibraryTemplateUrl = (url: string | null | undefined): boolean =>
  !!url && PHOTO_BOOTH_BACKGROUND_TEMPLATES.some((t) => url.endsWith(t.url));

export const findLibraryTemplate = (url: string | null | undefined) =>
  url ? PHOTO_BOOTH_BACKGROUND_TEMPLATES.find((t) => url.endsWith(t.url)) ?? null : null;
