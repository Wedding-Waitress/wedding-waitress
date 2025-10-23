import { validateMusicURL } from './urlValidation';

export interface SongMetadata {
  title: string;
  artist: string;
  url: string;
  platform: 'youtube' | 'spotify' | 'appleMusic' | 'generic';
  thumbnailUrl?: string;
}

export interface SongData {
  song: string;
  artist: string;
  link: string;
  moment?: string;
}

/**
 * Fetch metadata for a single URL
 * Falls back to URL parsing if API not available
 */
export async function fetchSongMetadata(url: string): Promise<SongMetadata> {
  const validation = validateMusicURL(url);
  
  if (!validation.isValid || !validation.normalizedUrl || !validation.platform) {
    throw new Error('Invalid URL');
  }

  try {
    switch (validation.platform) {
      case 'youtube':
        return await fetchYouTubeMetadata(validation.normalizedUrl);
      case 'spotify':
        return await fetchSpotifyMetadata(validation.normalizedUrl);
      case 'appleMusic':
        return await fetchAppleMusicMetadata(validation.normalizedUrl);
      default:
        return {
          title: 'Unknown Song',
          artist: 'Unknown Artist',
          url: validation.normalizedUrl,
          platform: validation.platform
        };
    }
  } catch (error) {
    console.warn('Metadata fetch failed, using URL parsing:', error);
    return parseUrlForMetadata(validation.normalizedUrl, validation.platform);
  }
}

/**
 * Fetch metadata for multiple URLs in parallel
 */
export async function fetchBulkMetadata(urls: string[]): Promise<SongMetadata[]> {
  const promises = urls.map(url => 
    fetchSongMetadata(url).catch(err => {
      console.error(`Failed to fetch metadata for ${url}:`, err);
      return {
        title: 'Unknown Song',
        artist: 'Unknown Artist',
        url,
        platform: 'generic' as const
      };
    })
  );

  return Promise.all(promises);
}

/**
 * YouTube metadata fetch using oEmbed (no API key required)
 */
async function fetchYouTubeMetadata(url: string): Promise<SongMetadata> {
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) throw new Error('Invalid YouTube URL');

  const oEmbedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
  
  const response = await fetch(oEmbedUrl);
  if (!response.ok) throw new Error('YouTube fetch failed');

  const data = await response.json();
  
  const { artist, title } = parseYouTubeTitleString(data.title);

  return {
    title: title || data.title,
    artist: artist || data.author_name || 'Unknown Artist',
    url,
    platform: 'youtube',
    thumbnailUrl: data.thumbnail_url
  };
}

/**
 * Spotify metadata fetch using oEmbed (no API key required)
 */
async function fetchSpotifyMetadata(url: string): Promise<SongMetadata> {
  const oEmbedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`;
  
  const response = await fetch(oEmbedUrl);
  if (!response.ok) throw new Error('Spotify fetch failed');

  const data = await response.json();
  
  const { artist, title } = parseSpotifyTitleString(data.title);

  return {
    title: title || 'Unknown Song',
    artist: artist || 'Unknown Artist',
    url,
    platform: 'spotify',
    thumbnailUrl: data.thumbnail_url
  };
}

/**
 * Apple Music - no oEmbed, fallback to URL parsing
 */
async function fetchAppleMusicMetadata(url: string): Promise<SongMetadata> {
  return parseUrlForMetadata(url, 'appleMusic');
}

/**
 * Extract YouTube video ID from various URL formats
 */
function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
    /youtube\.com\/embed\/([^&\n?#]+)/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}

/**
 * Parse YouTube title string (e.g., "Artist - Song Title")
 */
function parseYouTubeTitleString(titleString: string): { artist: string; title: string } {
  let cleaned = titleString
    .replace(/\(official\s+video\)/i, '')
    .replace(/\(official\s+audio\)/i, '')
    .replace(/\[official\]/i, '')
    .trim();

  const delimiters = [' - ', ' | ', ' – '];
  
  for (const delimiter of delimiters) {
    if (cleaned.includes(delimiter)) {
      const [artist, ...titleParts] = cleaned.split(delimiter);
      return {
        artist: artist.trim(),
        title: titleParts.join(delimiter).trim()
      };
    }
  }

  return {
    artist: 'Unknown Artist',
    title: cleaned
  };
}

/**
 * Parse Spotify title string (format: "Song Title by Artist Name")
 */
function parseSpotifyTitleString(titleString: string): { artist: string; title: string } {
  const match = titleString.match(/^(.+?)\s+by\s+(.+)$/i);
  
  if (match) {
    return {
      title: match[1].trim(),
      artist: match[2].trim()
    };
  }

  return {
    title: titleString,
    artist: 'Unknown Artist'
  };
}

/**
 * Fallback: Parse URL for basic metadata
 */
function parseUrlForMetadata(url: string, platform: string): SongMetadata {
  return {
    title: 'Unknown Song',
    artist: 'Unknown Artist',
    url,
    platform: platform as any
  };
}
