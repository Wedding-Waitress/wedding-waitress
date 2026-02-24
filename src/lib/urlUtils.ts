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
 * Builds a DJ questionnaire public view URL for the given share token
 */
export function buildDJQuestionnaireUrl(shareToken: string): string {
  const baseUrl = getPublicBaseUrl();
  return `${baseUrl}/dj-questionnaire/${shareToken}`;
}

/**
 * Builds a running sheet public view URL for the given share token
 */
export function buildRunningSheetUrl(shareToken: string): string {
  const baseUrl = getPublicBaseUrl();
  return `${baseUrl}/running-sheet/${encodeURIComponent(shareToken)}`;
}

/**
 * Builds a seating chart public view URL for the given share token
 */
export function buildSeatingChartUrl(shareToken: string): string {
  const baseUrl = getPublicBaseUrl();
  return `${baseUrl}/seating-chart/${encodeURIComponent(shareToken)}`;
}