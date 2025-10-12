/**
 * Utility functions for URL handling
 */

/**
 * Gets the public base URL for external links (QR codes, sharing, etc.)
 * Uses environment-aware logic: production URL when on production domain,
 * current origin when testing on different domains
 */
export function getPublicBaseUrl(): string {
  // If production URL is configured, ALWAYS use it for QR codes and external links
  // This ensures QR codes point to your custom domain regardless of preview environment
  if (import.meta.env.VITE_PUBLIC_BASE_URL) {
    return import.meta.env.VITE_PUBLIC_BASE_URL;
  }
  
  // Fallback to current origin only if no production URL is configured
  return window.location.origin;
}

/**
 * Builds a guest lookup URL for the given event slug
 */
export function buildGuestLookupUrl(eventSlug: string): string {
  const baseUrl = getPublicBaseUrl();
  return `${baseUrl}/s/${eventSlug}`;
}

/**
 * Builds a kiosk URL for the given event slug
 */
export function buildKioskUrl(eventSlug: string): string {
  const baseUrl = getPublicBaseUrl();
  return `${baseUrl}/kiosk/${eventSlug}`;
}

/**
 * Builds a gallery/upload URL for the given gallery slug
 */
export function buildGalleryUploadUrl(gallerySlug: string): string {
  const baseUrl = getPublicBaseUrl();
  return `${baseUrl}/g/${gallerySlug}`;
}