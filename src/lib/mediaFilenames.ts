/**
 * Utility functions for generating sequential media filenames
 * Format: {SEQ}-{TYPE}-(Event Name){Album Title}.{ext}
 * Example: 000001-Photo-(Event Name)Reema & Hossam's Engagement.jpg
 */

interface MediaFileNameParams {
  seqNumber: number;
  type: 'Photo' | 'Video' | 'Guest Book' | 'Audio';
  albumTitle: string;
  mimeType?: string;
  fileUrl?: string;
}

/**
 * Generates a media filename following the sequential naming convention
 */
export function generateMediaFilename(params: MediaFileNameParams): string {
  const { seqNumber, type, albumTitle, mimeType, fileUrl } = params;
  
  // Zero-pad to 6 digits
  const seqPadded = String(seqNumber).padStart(6, '0');
  
  // Determine extension from MIME type or file URL
  let ext = 'bin';
  if (mimeType) {
    const mimeMap: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'image/heic': 'heic',
      'image/heif': 'jpg',
      'video/mp4': 'mp4',
      'video/quicktime': 'mov',
      'video/x-msvideo': 'avi',
      'video/webm': 'webm',
      'audio/mpeg': 'mp3',
      'audio/mp4': 'm4a',
      'audio/x-m4a': 'm4a',
      'audio/wav': 'wav',
      'audio/webm': 'webm',
      'text/plain': 'txt',
    };
    ext = mimeMap[mimeType] || mimeType.split('/')[1] || 'bin';
  } else if (fileUrl) {
    // Extract from URL
    const match = fileUrl.match(/\.([a-z0-9]+)(\?|$)/i);
    if (match) ext = match[1];
  }
  
  // Compose filename with exact album title (preserve spaces, apostrophes, ampersands)
  return `${seqPadded}-${type}-${albumTitle}.${ext}`;
}

/**
 * Generates a safe storage path by sanitizing the filename
 * Used for internal storage, not for user-facing download names
 */
export function getSafeStoragePath(filename: string): string {
  // For storage paths: remove special chars, limit length
  return filename
    .replace(/["'&]/g, '')
    .replace(/[^\w.-]/g, '_')
    .substring(0, 200);
}

/**
 * Gets the media type label from post_type field
 */
export function getMediaTypeLabel(postType: string): 'Photo' | 'Video' | 'Guest Book' | 'Audio' {
  switch (postType) {
    case 'photo':
      return 'Photo';
    case 'video':
      return 'Video';
    case 'text':
      return 'Guest Book';
    case 'audio':
      return 'Audio';
    default:
      return 'Photo';
  }
}
