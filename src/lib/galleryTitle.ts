/**
 * Resolves the title shown on guest-facing gallery pages.
 * Precedence: host-set gallery title -> the linked event's real name -> couple names.
 * Never falls back to a placeholder or another event's data.
 */
export interface GalleryTitleSource {
  gallery_title?: string | null;
  event_name?: string | null;
  partner1_name?: string | null;
  partner2_name?: string | null;
}

export function resolveGalleryTitle(source: GalleryTitleSource | null | undefined): string {
  if (!source) return '';
  const custom = source.gallery_title?.trim();
  if (custom) return custom;
  const eventName = source.event_name?.trim();
  if (eventName) return eventName;
  return [source.partner1_name, source.partner2_name]
    .map(n => n?.trim())
    .filter(Boolean)
    .join(' & ');
}
