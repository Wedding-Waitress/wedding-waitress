// Photo & Video Sharing — Phase 1 client-side validation
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

const EXT_MIME: Record<string, string> = {
  mov: 'video/quicktime',
  qt: 'video/quicktime',
  mp4: 'video/mp4',
  m4v: 'video/mp4',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

function getExt(name: string): string {
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i + 1).toLowerCase() : '';
}

/** Resolve a usable MIME. iPhone Safari often reports empty file.type for MOVs. */
export function effectiveMime(file: File): { mime: string; inferred: boolean } {
  const t = (file.type || '').toLowerCase();
  if (t) return { mime: t, inferred: false };
  const ext = getExt(file.name);
  const mapped = EXT_MIME[ext];
  if (mapped) return { mime: mapped, inferred: true };
  return { mime: '', inferred: true };
}

export function detectKind(mime: string, fileName?: string): MediaKind | null {
  if (mime.startsWith('image/')) return 'photo';
  if (mime.startsWith('video/')) return 'video';
  if (fileName) {
    const ext = getExt(fileName);
    if (['mov', 'mp4', 'm4v', 'qt'].includes(ext)) return 'video';
    if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) return 'photo';
  }
  return null;
}

/** Try to read video duration. Resolves null (instead of throwing) on failure or timeout. */
export function getVideoDurationSec(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    let settled = false;
    const url = URL.createObjectURL(file);
    const done = (val: number | null) => {
      if (settled) return;
      settled = true;
      try { URL.revokeObjectURL(url); } catch {}
      resolve(val);
    };
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    (video as any).playsInline = true;
    video.onloadedmetadata = () => {
      const d = Math.round(video.duration);
      done(isFinite(d) && d > 0 ? d : null);
    };
    video.onerror = () => done(null);
    try { video.src = url; } catch { done(null); }
    // Hard timeout — some iPhone HEVC MOVs never fire loadedmetadata in Safari
    setTimeout(() => done(null), 8000);
  });
}

export type RejectReason =
  | 'photo_too_large'
  | 'video_too_large'
  | 'video_too_long'
  | 'unsupported_type'
  | 'file_unreadable';

export interface ValidationResult {
  file: File;
  fileName: string;
  kind: MediaKind | null;
  mime: string;
  mimeInferred: boolean;
  size: number;
  duration: number | null;
  durationUnknown: boolean;
  ok: boolean;
  reason?: RejectReason;
  reasonText?: string;
}

// Backwards-compatible alias used by some callers.
export type ValidatedFile = ValidationResult;

export type ValidationStage = 'preparing' | 'checking' | 'ready';

export async function validateFile(
  file: File,
  limits: MediaLimits,
  onStage?: (stage: ValidationStage) => void,
): Promise<ValidationResult> {
  onStage?.('preparing');
  const { mime, inferred } = effectiveMime(file);
  const kind = detectKind(mime, file.name);
  const base = {
    file,
    fileName: file.name,
    mime,
    mimeInferred: inferred,
    size: file.size,
    duration: null as number | null,
    durationUnknown: false,
  };

  if (!kind || !mime) {
    return {
      ...base,
      kind: null,
      ok: false,
      reason: 'unsupported_type',
      reasonText: 'Unsupported file type',
    };
  }

  if (kind === 'photo') {
    if (!limits.allowed_photo_mimes.includes(mime)) {
      return { ...base, kind, ok: false, reason: 'unsupported_type', reasonText: 'Photo format not allowed (JPG, PNG, WebP)' };
    }
    if (file.size > limits.max_photo_bytes) {
      return { ...base, kind, ok: false, reason: 'photo_too_large', reasonText: `Photo over ${(limits.max_photo_bytes / 1024 / 1024).toFixed(0)} MB` };
    }
    onStage?.('ready');
    return { ...base, kind, ok: true };
  }

  // video
  if (!limits.allowed_video_mimes.includes(mime)) {
    return { ...base, kind, ok: false, reason: 'unsupported_type', reasonText: 'Video format not allowed (MP4, MOV)' };
  }
  if (file.size > limits.max_video_bytes) {
    return { ...base, kind, ok: false, reason: 'video_too_large', reasonText: `Video over ${(limits.max_video_bytes / 1024 / 1024).toFixed(0)} MB` };
  }
  onStage?.('checking');
  let duration: number | null = null;
  try {
    duration = await getVideoDurationSec(file);
  } catch {
    duration = null;
  }
  if (duration != null && duration > limits.max_video_duration_sec) {
    return { ...base, kind, duration, ok: false, reason: 'video_too_long', reasonText: `Video over ${limits.max_video_duration_sec} s` };
  }
  onStage?.('ready');
  // Duration unknown = still allow upload (server accepts null), but flag it for the UI.
  return {
    ...base,
    kind,
    duration,
    durationUnknown: duration == null,
    ok: true,
  };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}
