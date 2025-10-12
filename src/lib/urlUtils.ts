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
 * Builds a short link URL for the given event short slug
 * @param shortSlug - 5-character base62 slug (e.g., "AB12C")
 */
export function buildShortLinkUrl(shortSlug: string): string {
  const baseUrl = getPublicBaseUrl();
  return `${baseUrl}/e/${shortSlug}`;
}

/**
 * Gets the QR code URL for an event (short or full based on settings)
 * @param eventSlug - Full event slug (e.g., "wedding-2025")
 * @param shortSlug - Short slug (e.g., "AB12C")
 * @param useSimplified - Whether to use simplified short link
 */
export function buildQRCodeUrl(
  eventSlug: string, 
  shortSlug: string | null, 
  useSimplified: boolean
): string {
  if (useSimplified && shortSlug) {
    return buildShortLinkUrl(shortSlug);
  }
  return buildGuestLookupUrl(eventSlug);
}