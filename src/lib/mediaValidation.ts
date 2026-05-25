// Photo & Video Gallery — Phase 1 client-side validation
export const PHOTO_MIMES = ['image/jpeg', 'image/png', 'image/webp'];
export const VIDEO_MIMES = ['video/mp4', 'video/quicktime'];

export type MediaKind = 'photo' | 'video';

export interface MediaLimits {
  max_photo_bytes: number;
  max_video_bytes: number;
  max_video_duration_sec: number;
  allowed_photo_mimes: string[];
  allowed_video_mimes: string[];
}

export function detectKind(file: File): MediaKind | null {
  if (file.type.startsWith('image/')) return 'photo';
  if (file.type.startsWith('video/')) return 'video';
  return null;
}

export function getVideoDurationSec(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.onloadedmetadata = () => {
      const d = Math.round(video.duration);
      URL.revokeObjectURL(url);
      if (!isFinite(d) || d <= 0) reject(new Error('Could not read video duration'));
      else resolve(d);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read video metadata'));
    };
    video.src = url;
  });
}

export interface ValidatedFile {
  file: File;
  kind: MediaKind;
  mime: string;
  size: number;
  duration?: number;
}

export async function validateFile(file: File, limits: MediaLimits): Promise<ValidatedFile> {
  const kind = detectKind(file);
  if (!kind) throw new Error(`${file.name}: Unsupported file type`);

  if (kind === 'photo') {
    if (!limits.allowed_photo_mimes.includes(file.type)) {
      throw new Error(`${file.name}: Photo format not allowed (use JPG, PNG, or WebP)`);
    }
    if (file.size > limits.max_photo_bytes) {
      throw new Error(`${file.name}: Photo larger than ${(limits.max_photo_bytes / 1024 / 1024).toFixed(0)} MB`);
    }
    return { file, kind, mime: file.type, size: file.size };
  }

  if (!limits.allowed_video_mimes.includes(file.type)) {
    throw new Error(`${file.name}: Video format not allowed (use MP4 or MOV)`);
  }
  if (file.size > limits.max_video_bytes) {
    throw new Error(`${file.name}: Video larger than ${(limits.max_video_bytes / 1024 / 1024).toFixed(0)} MB`);
  }
  const duration = await getVideoDurationSec(file);
  if (duration > limits.max_video_duration_sec) {
    throw new Error(`${file.name}: Video longer than ${limits.max_video_duration_sec}s`);
  }
  return { file, kind, mime: file.type, size: file.size, duration };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}
