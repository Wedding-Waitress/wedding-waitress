// Built-in Wedding Waitress photo-strip background templates.
import importedTemplateCatalogue from './photoBoothBackgroundTemplates.catalogue.json';

export interface PhotoBoothBackgroundTemplate {
  id: string;
  name: string;
  /** Grouping used by the Template Library filters */
  category: string;
  /** Dominant colour family used by the Template Library filters */
  colour: string;
  /** Full-master JPEG used for composition */
  url: string;
  /** Lightweight preview image used in the picker */
  thumbUrl: string;
  /** Original import filename, retained for idempotent catalogue updates */
  sourceFilename: string;
}

const LIBRARY_ROOT = '/photobooth-templates/';

export const PHOTO_BOOTH_BACKGROUND_TEMPLATES: PhotoBoothBackgroundTemplate[] =
  importedTemplateCatalogue as PhotoBoothBackgroundTemplate[];

export const PHOTO_BOOTH_TEMPLATE_CATEGORIES = Array.from(
  new Set(PHOTO_BOOTH_BACKGROUND_TEMPLATES.map((x) => x.category)),
).sort();

export const PHOTO_BOOTH_TEMPLATE_COLOURS = Array.from(
  new Set(PHOTO_BOOTH_BACKGROUND_TEMPLATES.map((x) => x.colour)),
).sort();

export const filterPhotoBoothBackgroundTemplates = (
  query: string,
  category: string,
  colour: string,
): PhotoBoothBackgroundTemplate[] => filterPhotoBoothTemplates(
  PHOTO_BOOTH_BACKGROUND_TEMPLATES,
  query,
  category,
  colour,
);

export const filterPhotoBoothTemplates = (
  templates: PhotoBoothBackgroundTemplate[],
  query: string,
  category: string,
  colour: string,
): PhotoBoothBackgroundTemplate[] => {
  const normalisedQuery = query.trim().toLowerCase();
  return templates.filter((template) =>
    (!normalisedQuery || template.name.toLowerCase().includes(normalisedQuery))
    && (category === 'all' || template.category === category)
    && (colour === 'all' || template.colour === colour));
};

/** True when the given template URL is one of the current built-in templates. */
export const isLibraryTemplateUrl = (url: string | null | undefined): boolean =>
  !!url && PHOTO_BOOTH_BACKGROUND_TEMPLATES.some((x) => url.endsWith(x.url));

export const findLibraryTemplate = (url: string | null | undefined) =>
  url ? PHOTO_BOOTH_BACKGROUND_TEMPLATES.find((x) => url.endsWith(x.url)) ?? null : null;

export const findLibraryTemplateById = (id: string | null | undefined) =>
  id ? PHOTO_BOOTH_BACKGROUND_TEMPLATES.find((x) => x.id === id) ?? null : null;

/** Resolve a stable built-in identity first, then the persisted/custom URL. */
export const resolvePhotoBoothTemplateSelection = (
  url: string | null | undefined,
  templateId?: string | null,
): string | null => {
  const byId = findLibraryTemplateById(templateId);
  if (byId) return byId.url;
  return normalisePhotoBoothTemplateUrl(url);
};

/**
 * Retired library URLs are reset to the existing colour background. Custom
 * uploaded URLs remain untouched, so event-owned artwork is never discarded.
 */
export const normalisePhotoBoothTemplateUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  if (isLibraryTemplateUrl(url)) return url;
  return url.includes(LIBRARY_ROOT) ? null : url;
};
