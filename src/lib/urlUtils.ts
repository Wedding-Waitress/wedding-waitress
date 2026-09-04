/**
 * Utility functions for URL handling
 */

/**
 * Gets the public base URL for external links (QR codes, sharing, etc.)
 * Always uses production URL if configured to ensure QR codes and shareable links work correctly
 */
export function getPublicBaseUrl(): string {
  const prodUrl = import.meta.env.VITE_PUBLIC_BASE_URL?.trim();
  
  // Always use production URL if configured (for QR codes, sharing, etc.)
  // These links are meant to be used externally and must work regardless of where they're generated
  if (prodUrl) {
    return prodUrl;
  }
  
  // Fallback to current origin if no production URL is configured
  return window.location.origin;
}

/**
 * Gets the public origin for a share link created by the currently running app.
 * Share links must stay on the origin serving the current application because
 * that build can point at a different Supabase project from another deployed
 * environment. The configured origin is only a non-browser fallback.
 */
export function getEnvironmentAwareShareBaseUrl(): string {
  const runtimeOrigin = typeof window !== 'undefined' ? window.location.origin : '';

  return runtimeOrigin || import.meta.env.VITE_PUBLIC_BASE_URL?.trim() || '';
}

/**
 * Builds a guest lookup URL for the given event slug
 */
export function buildGuestLookupUrl(eventSlug: string): string {
  const baseUrl = getPublicBaseUrl();
  return `${baseUrl}/s/${eventSlug}`;
}

/**
 * Builds a Live Slideshow URL for the given event slug
 */
export function buildLiveSlideshowUrl(eventSlug: string): string {
  const baseUrl = getPublicBaseUrl();
  return `${baseUrl}/live-slideshow/${encodeURIComponent(eventSlug)}`;
}

/**
 * Builds a DJ questionnaire public view URL for the given share token
 */
export function buildDJQuestionnaireUrl(shareToken: string, eventSlug?: string): string {
  const baseUrl = getEnvironmentAwareShareBaseUrl();
  if (eventSlug) {
    return `${baseUrl}/dj-mc/${encodeURIComponent(eventSlug)}/${encodeURIComponent(shareToken)}`;
  }
  return `${baseUrl}/dj-mc/${encodeURIComponent(shareToken)}`;
}

/**
 * Builds a running sheet public view URL for the given share token
 */
export function buildRunningSheetUrl(shareToken: string, eventSlug?: string): string {
  const baseUrl = getEnvironmentAwareShareBaseUrl();
  if (eventSlug) {
    return `${baseUrl}/shared-running-sheet/${encodeURIComponent(eventSlug)}/${encodeURIComponent(shareToken)}`;
  }
  return `${baseUrl}/shared-running-sheet/${encodeURIComponent(shareToken)}`;
}

/**
 * Builds a seating chart public view URL for the given share token
 */
export function buildSeatingChartUrl(shareToken: string): string {
  const baseUrl = getPublicBaseUrl();
  return `${baseUrl}/seating-chart/${encodeURIComponent(shareToken)}`;
}

/**
 * Builds a dynamic QR code URL for the given short code
 */
export function buildDynamicQRUrl(code: string): string {
  const baseUrl = getPublicBaseUrl();
  return `${baseUrl}/qr/${encodeURIComponent(code)}`;
}

/**
 * Builds a Photo & Video Sharing guest upload URL for the given token
 */
export function buildGalleryUploadUrl(token: string): string {
  const baseUrl = getPublicBaseUrl();
  return `${baseUrl}/gallery/${encodeURIComponent(token)}`;
}

/**
 * Builds a Photo & Video Sharing public Live View / Slideshow URL.
 */
export function buildGalleryLiveUrl(token: string): string {
  const baseUrl = getPublicBaseUrl();
  return `${baseUrl}/gallery-live/${encodeURIComponent(token)}`;
}

/**
 * Builds the Live Slideshow URL (venue TV / projector view) for the given token.
 */
export function buildGallerySlideshowUrl(token: string): string {
  const baseUrl = getPublicBaseUrl();
  return `${baseUrl}/gallery/${encodeURIComponent(token)}/slideshow`;
}

/**
 * Builds a Photo & Video Sharing Voice Guestbook URL for the given token.
 */
export function buildGalleryGuestbookUrl(token: string): string {
  // Canonical unified guest app — Guestbook tab.
  return `${buildGalleryUploadUrl(token)}?tab=guestbook`;
}

/**
 * Builds a Photo & Video Sharing Photo Booth URL for the given token.
 */
export function buildGalleryPhotoBoothUrl(token: string): string {
  // Canonical unified guest app — Photo Booth tab.
  return `${buildGalleryUploadUrl(token)}?tab=booth`;
}
/**
 * Canonical guest app URL (single source of truth for all Guest Experience
 * access QR codes and public links). Opens the unified guest app on its
 * default Upload tab.
 */
export function buildGalleryGuestAppUrl(token: string | null | undefined): string {
  return token ? buildGalleryUploadUrl(token) : '';
}
