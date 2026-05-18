// =============================================================================
// Canva-style image pipeline (shared across Signage, Invitations, Place Cards).
//
// Strategy:
//   1. PREVIEW URL  — Supabase Image Transformations resize the master URL
//                     on-the-fly to ~2400px @ q=90. Server-side, cached at the
//                     edge. Falls back to the master URL on non-storage URLs.
//   2. THUMBNAIL URL — same transform pipeline, ~400px @ q=75.
//   3. MASTER URL   — untouched original (used by PDF/PNG export at 300 DPI).
//
// Why this works without touching every upload path:
//   Every URL already returned by `supabase.storage.from(bucket).getPublicUrl()`
//   accepts `?width=…&quality=…` query params when image transformations are
//   enabled on the project. The same URL is used everywhere — we just append
//   the right transform per surface.
//
// The `optimize-image` edge function is the long-term path: it pre-generates
// the 3 variants on upload, so even projects without transformations enabled
// (or non-image masters) get the same experience. The helpers below transparently
// prefer pre-generated variant URLs when present.
// =============================================================================

import { supabase } from '@/integrations/supabase/client';
import { useEffect, useMemo, useRef, useState } from 'react';

const PREVIEW_WIDTH_PX = 1400;
const PREVIEW_QUALITY = 70;
const THUMB_WIDTH_PX = 400;
const THUMB_QUALITY = 75;

/** Detect a Supabase storage public URL. */
function isSupabaseStorageUrl(url: string | null | undefined): url is string {
  return !!url && /\/storage\/v1\/object\/(?:public|sign)\//.test(url);
}

/**
 * Append `?width=…&quality=…` Supabase Image Transformation params, and rewrite
 * the path from `/storage/v1/object/...` to `/storage/v1/render/image/...` so
 * the resize actually happens server-side (the /object/ endpoint ignores
 * transform params and would serve the full master file).
 * Safe on any URL — non-storage URLs are returned unchanged.
 */
export function transformedUrl(
  url: string | null | undefined,
  opts: { width?: number; quality?: number; format?: 'origin' } = {},
): string | null {
  if (!url) return null;
  if (!isSupabaseStorageUrl(url)) return url;
  try {
    const u = new URL(url);
    const hasTransform = !!(opts.width || opts.quality || opts.format);
    if (hasTransform) {
      u.pathname = u.pathname
        .replace('/storage/v1/object/public/', '/storage/v1/render/image/public/')
        .replace('/storage/v1/object/sign/', '/storage/v1/render/image/sign/');
      if (opts.width) u.searchParams.set('width', String(opts.width));
      if (opts.quality) u.searchParams.set('quality', String(opts.quality));
      if (opts.format) u.searchParams.set('format', opts.format);
    }
    return u.toString();
  } catch {
    return url;
  }
}


/** Build a ~2400px high-quality preview URL for the live editor. */
export function previewUrlFor(masterUrl: string | null | undefined): string | null {
  return transformedUrl(masterUrl, { width: PREVIEW_WIDTH_PX, quality: PREVIEW_QUALITY });
}

/** Build a ~400px thumbnail URL for gallery cards. */
export function thumbnailUrlFor(masterUrl: string | null | undefined): string | null {
  return transformedUrl(masterUrl, { width: THUMB_WIDTH_PX, quality: THUMB_QUALITY });
}

// =============================================================================
// useOptimizedPreview — picks the best preview URL available.
//
// Priority:
//   1. pre-generated `previewUrl` (from edge function) — instant, perfect.
//   2. Supabase transformed master URL — instant, server-side resize.
//   3. raw master URL (last resort).
//
// Probes the transform URL with a HEAD request once; if it 4xx/5xx (e.g. image
// transformations are disabled on this project, or the master is too large),
// falls back to the raw master URL so the editor never breaks.
// =============================================================================

export function useOptimizedPreview(
  masterUrl: string | null | undefined,
  previewUrl?: string | null | undefined,
): { url: string | null; ready: boolean } {
  const [url, setUrl] = useState<string | null>(() => previewUrl ?? previewUrlFor(masterUrl) ?? masterUrl ?? null);
  const [ready, setReady] = useState<boolean>(!masterUrl);
  const probeCache = useRef<Map<string, boolean>>(new Map());

  useEffect(() => {
    let cancelled = false;

    if (!masterUrl) {
      setUrl(null);
      setReady(true);
      return;
    }

    // 1. If the caller already has a pre-generated preview from the edge function, use it.
    if (previewUrl) {
      setUrl(previewUrl);
      setReady(true);
      return;
    }

    // 2. Try Supabase transformed URL.
    const candidate = previewUrlFor(masterUrl);
    if (!candidate || candidate === masterUrl) {
      setUrl(masterUrl);
      setReady(true);
      return;
    }

    // Optimistically use the transformed URL — the <img> will render it directly.
    // We only fall back if a probe HEAD fails.
    setUrl(candidate);
    setReady(false);

    const cached = probeCache.current.get(candidate);
    if (cached === true) {
      setReady(true);
      return;
    }
    if (cached === false) {
      setUrl(masterUrl);
      setReady(true);
      return;
    }

    fetch(candidate, { method: 'HEAD' })
      .then((r) => {
        if (cancelled) return;
        if (r.ok) {
          probeCache.current.set(candidate, true);
          setReady(true);
        } else {
          probeCache.current.set(candidate, false);
          setUrl(masterUrl);
          setReady(true);
        }
      })
      .catch(() => {
        if (cancelled) return;
        probeCache.current.set(candidate, false);
        setUrl(masterUrl);
        setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [masterUrl, previewUrl]);

  return { url, ready };
}

// =============================================================================
// Server-side optimize-image edge function client
// =============================================================================

export interface OptimizeImageResult {
  masterUrl: string;
  previewUrl: string;
  thumbUrl: string;
  width: number;
  height: number;
}

/**
 * Upload a file to storage, then invoke the optimize-image edge function which
 * produces master / preview / thumb variants. Falls back to a plain upload
 * (master only) if the edge function is unavailable, so uploads never break.
 */
export async function uploadAndOptimize(
  file: File,
  opts: { bucket: string; folder: string; userId: string },
): Promise<OptimizeImageResult> {
  const ext = (file.name.match(/\.([a-zA-Z0-9]+)$/)?.[1] || 'jpg').toLowerCase();
  const stamp = Date.now();
  const token = Math.random().toString(36).slice(2, 10);
  const sourcePath = `${opts.folder}/${opts.userId}/sources/${stamp}-${token}.${ext}`;

  const up = await supabase.storage.from(opts.bucket).upload(sourcePath, file, {
    contentType: file.type || 'image/jpeg',
    upsert: false,
  });
  if (up.error) throw up.error;

  // Best-effort: ask the edge function for server-side variants.
  try {
    const { data, error } = await supabase.functions.invoke('optimize-image', {
      body: { sourcePath, bucket: opts.bucket, folder: opts.folder },
    });
    if (!error && data?.masterUrl && data?.previewUrl) {
      return data as OptimizeImageResult;
    }
  } catch {
    /* fall through to client-side fallback */
  }

  // Fallback: return the raw upload as master, derive preview/thumb via transforms.
  const masterUrl = supabase.storage.from(opts.bucket).getPublicUrl(sourcePath).data.publicUrl;
  return {
    masterUrl,
    previewUrl: previewUrlFor(masterUrl) || masterUrl,
    thumbUrl: thumbnailUrlFor(masterUrl) || masterUrl,
    width: 0,
    height: 0,
  };
}

// =============================================================================
// 300 DPI auto-upscale check — warn if master is too small for the print size
// =============================================================================

const DPI = 300;
const MM_PER_INCH = 25.4;
const MIN_QUALITY_RATIO = 0.8; // master must be ≥80% of required pixels

export interface PrintFitResult {
  ok: boolean;
  requiredWidthPx: number;
  requiredHeightPx: number;
  masterWidthPx: number;
  masterHeightPx: number;
  message?: string;
}

export function checkPrintFit(
  masterWidthPx: number | null | undefined,
  masterHeightPx: number | null | undefined,
  printSize: { widthMm: number; heightMm: number; label?: string },
): PrintFitResult {
  const requiredWidthPx = Math.round((printSize.widthMm / MM_PER_INCH) * DPI);
  const requiredHeightPx = Math.round((printSize.heightMm / MM_PER_INCH) * DPI);
  const mw = masterWidthPx || 0;
  const mh = masterHeightPx || 0;

  // Unknown dimensions — let it through (we don't want to block exports for legacy images).
  if (!mw || !mh) {
    return {
      ok: true,
      requiredWidthPx,
      requiredHeightPx,
      masterWidthPx: mw,
      masterHeightPx: mh,
    };
  }

  const ratio = Math.min(mw / requiredWidthPx, mh / requiredHeightPx);
  if (ratio >= MIN_QUALITY_RATIO) {
    return { ok: true, requiredWidthPx, requiredHeightPx, masterWidthPx: mw, masterHeightPx: mh };
  }

  return {
    ok: false,
    requiredWidthPx,
    requiredHeightPx,
    masterWidthPx: mw,
    masterHeightPx: mh,
    message:
      `Your image is ${mw}×${mh} px. For ${printSize.label || 'this size'} at 300 DPI you need ` +
      `${requiredWidthPx}×${requiredHeightPx} px. The PDF will still export, but print quality may be reduced.`,
  };
}
