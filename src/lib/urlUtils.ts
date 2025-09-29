/**
 * Utility functions for URL handling
 */

/**
 * Gets the public base URL for external links (QR codes, sharing, etc.)
 * Uses environment-aware logic: production URL when on production domain,
 * current origin when testing on different domains
 */
export function getPublicBaseUrl(): string {
  // Check for environment variable first
  if (import.meta.env.VITE_PUBLIC_BASE_URL) {
    try {
      // Extract hostname from configured production URL
      const configuredUrl = new URL(import.meta.env.VITE_PUBLIC_BASE_URL);
      const currentHostname = window.location.hostname;
      
      // If we're on the production domain, use the configured URL
      if (currentHostname === configuredUrl.hostname) {
        return import.meta.env.VITE_PUBLIC_BASE_URL;
      }
      
      // Otherwise, use current origin for testing environments
      return window.location.origin;
    } catch (error) {
      // If URL parsing fails, fallback to current origin
      return window.location.origin;
    }
  }
  
  // Fallback to current origin for development/testing
  return window.location.origin;
}

/**
 * Builds a guest lookup URL for the given event slug
 */
export function buildGuestLookupUrl(eventSlug: string): string {
  const baseUrl = getPublicBaseUrl();
  return `${baseUrl}/s/${eventSlug}`;
}