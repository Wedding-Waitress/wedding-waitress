// Built-in Wedding Waitress photo-strip background templates.
// Each template is a full 1440 x 2000 px vertical JPEG canvas that becomes the
// complete background of the generated photo strip. Add new entries here — the
// Photo Booth Customisation UI and the Template Library gallery render the
// collection automatically, so no interface changes are needed to grow it.

export interface PhotoBoothBackgroundTemplate {
  id: string;
  name: string;
  /** Grouping used by the Template Library filters */
  category: string;
  /** Dominant colour family used by the Template Library filters */
  colour: string;
  /** Full-size 1440 x 2000 JPEG used for composition */
  url: string;
  /** Small preview image used in the picker */
  thumbUrl: string;
}

const t = (
  id: string,
  name: string,
  category: string,
  colour: string,
): PhotoBoothBackgroundTemplate => ({
  id,
  name,
  category,
  colour,
  url: `/photobooth-templates/${id}.jpg`,
  thumbUrl: `/photobooth-templates/${id}-thumb.jpg`,
});

export const PHOTO_BOOTH_BACKGROUND_TEMPLATES: PhotoBoothBackgroundTemplate[] = [
  t('classic-champagne', 'Classic Champagne', 'Classic', 'Neutral'),
  t('soft-floral', 'Soft Floral', 'Floral', 'Neutral'),
  t('romantic-blush', 'Romantic Blush', 'Floral', 'Pink'),
  t('sage-botanical', 'Sage Botanical', 'Botanical', 'Green'),
  t('midnight-navy', 'Midnight Navy', 'Modern', 'Blue'),
  t('burgundy-gold', 'Burgundy and Gold', 'Classic', 'Red'),
  t('black-white-luxe', 'Black and White Luxe', 'Modern', 'Monochrome'),
  t('dusty-blue', 'Dusty Blue', 'Floral', 'Blue'),
  t('terracotta-romance', 'Terracotta Romance', 'Boho', 'Orange'),
  t('lavender-elegance', 'Lavender Elegance', 'Floral', 'Purple'),
];

export const PHOTO_BOOTH_TEMPLATE_CATEGORIES = Array.from(
  new Set(PHOTO_BOOTH_BACKGROUND_TEMPLATES.map((x) => x.category)),
).sort();

export const PHOTO_BOOTH_TEMPLATE_COLOURS = Array.from(
  new Set(PHOTO_BOOTH_BACKGROUND_TEMPLATES.map((x) => x.colour)),
).sort();

/** True when the given template URL is one of the built-in library templates. */
export const isLibraryTemplateUrl = (url: string | null | undefined): boolean =>
  !!url && PHOTO_BOOTH_BACKGROUND_TEMPLATES.some((x) => url.endsWith(x.url));

export const findLibraryTemplate = (url: string | null | undefined) =>
  url ? PHOTO_BOOTH_BACKGROUND_TEMPLATES.find((x) => url.endsWith(x.url)) ?? null : null;
