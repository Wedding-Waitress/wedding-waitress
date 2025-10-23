/**
 * Validates and normalizes music platform URLs
 */

const MUSIC_URL_PATTERNS = {
  youtube: /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\/.+/i,
  spotify: /^https?:\/\/open\.spotify\.com\/.+/i,
  appleMusic: /^https?:\/\/music\.apple\.com\/.+/i,
  generic: /^https:\/\/.+/i,
};

export interface URLValidationResult {
  isValid: boolean;
  platform?: 'youtube' | 'spotify' | 'appleMusic' | 'generic';
  normalizedUrl?: string;
  error?: string;
}

/**
 * Validates a music URL and identifies the platform
 */
export const validateMusicURL = (url: string): URLValidationResult => {
  if (!url || url.trim() === '') {
    return { isValid: true }; // Empty is valid (optional field)
  }

  const trimmed = url.trim();

  // Check YouTube
  if (MUSIC_URL_PATTERNS.youtube.test(trimmed)) {
    return {
      isValid: true,
      platform: 'youtube',
      normalizedUrl: trimmed.startsWith('http') ? trimmed : `https://${trimmed}`,
    };
  }

  // Check Spotify
  if (MUSIC_URL_PATTERNS.spotify.test(trimmed)) {
    return {
      isValid: true,
      platform: 'spotify',
      normalizedUrl: trimmed,
    };
  }

  // Check Apple Music
  if (MUSIC_URL_PATTERNS.appleMusic.test(trimmed)) {
    return {
      isValid: true,
      platform: 'appleMusic',
      normalizedUrl: trimmed,
    };
  }

  // Check generic HTTPS
  if (MUSIC_URL_PATTERNS.generic.test(trimmed)) {
    return {
      isValid: true,
      platform: 'generic',
      normalizedUrl: trimmed,
    };
  }

  // Invalid URL
  return {
    isValid: false,
    error: 'Must be a valid HTTPS URL (YouTube, Spotify, Apple Music, or any HTTPS link)',
  };
};

/**
 * Get platform display name
 */
export const getPlatformName = (platform?: string): string => {
  switch (platform) {
    case 'youtube': return 'YouTube';
    case 'spotify': return 'Spotify';
    case 'appleMusic': return 'Apple Music';
    default: return 'Link';
  }
};

/**
 * Ensure URL is absolute with protocol
 */
export const ensureAbsoluteUrl = (url: string): string => {
  if (!url) return '';
  const trimmed = url.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  return `https://${trimmed}`;
};
