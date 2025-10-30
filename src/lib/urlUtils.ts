/**
 * Utility functions for URL handling
 */

/**
 * Detects if the current environment is a preview/development environment
 */
function isPreviewEnvironment(): boolean {
  const origin = window.location.origin;
  return origin.includes('localhost') || 
         origin.includes('.lovableproject.com') || 
         origin.includes('.lovable.app');
}

/**
 * Gets the public base URL for external links (QR codes, sharing, etc.)
 * Environment-aware: uses current origin in preview, production URL in production
 */
export function getPublicBaseUrl(): string {
  const prodUrl = import.meta.env.VITE_PUBLIC_BASE_URL?.trim();
  const forceProd = import.meta.env.VITE_FORCE_PROD_LINKS === 'true';
  
  // In preview environments, use current origin unless forced to use production
  if (isPreviewEnvironment() && !forceProd) {
    return window.location.origin;
  }
  
  // In production or when forced, use production URL or fallback to current origin
  return prodUrl || window.location.origin;
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
 * Builds a gallery URL for the given gallery slug
 * Uses dedicated Photo & Video sharing subdomain if configured
 * Environment-aware: uses current domain in preview environments
 */
export function buildGalleryUploadUrl(gallerySlug: string): string {
  const shareUrl = import.meta.env.VITE_PHOTO_SHARE_BASE_URL?.trim();
  const forceShare = import.meta.env.VITE_FORCE_PHOTO_SHARE_QR === 'true';
  
  // Use photo share subdomain only if configured and (in production OR forced)
  const base = (shareUrl && (!isPreviewEnvironment() || forceShare)) 
    ? shareUrl 
    : getPublicBaseUrl();
  
  // Clean trailing slash and encode slug
  return `${base.replace(/\/$/, '')}/${encodeURIComponent(gallerySlug)}`;
}

/**
 * Builds a DJ questionnaire public view URL for the given share token
 */
export function buildDJQuestionnaireUrl(shareToken: string): string {
  const baseUrl = getPublicBaseUrl();
  return `${baseUrl}/dj-questionnaire/${shareToken}`;
}