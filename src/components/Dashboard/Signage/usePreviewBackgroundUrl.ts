import { useEffect, useRef, useState } from 'react';

/**
 * Signage-only helper: takes a (potentially huge) master image URL and returns
 * a downscaled JPEG blob URL suitable for the live editor / preview.
 *
 * - Longest edge clamped to MAX_EDGE.
 * - JPEG quality 0.82.
 * - Falls back to the master URL if the image is already small, the load
 *   fails, or the canvas tainting prevents export (CORS).
 * - Revokes the previous object URL on change/unmount.
 *
 * The original master URL is never modified or persisted — PDF export keeps
 * reading the full-resolution file from settings.background_image_url /
 * background_image_print_url.
 */
const MAX_EDGE = 2400;
const JPEG_QUALITY = 0.92;

export function usePreviewBackgroundUrl(masterUrl: string | null | undefined) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(masterUrl ?? null);
  const [ready, setReady] = useState<boolean>(!masterUrl);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    // Always revoke any previous blob before starting a new pass.
    const revokePrev = () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };

    if (!masterUrl) {
      revokePrev();
      setPreviewUrl(null);
      setReady(true);
      return;
    }

    // Start by showing the master immediately so the preview is never blank.
    setPreviewUrl(masterUrl);
    setReady(false);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';

    img.onload = () => {
      if (cancelled) return;
      const longest = Math.max(img.naturalWidth, img.naturalHeight);

      // Already small — just use the original URL.
      if (longest <= MAX_EDGE) {
        revokePrev();
        setPreviewUrl(masterUrl);
        setReady(true);
        return;
      }

      const scale = MAX_EDGE / longest;
      const w = Math.max(1, Math.round(img.naturalWidth * scale));
      const h = Math.max(1, Math.round(img.naturalHeight * scale));

      try {
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('no 2d ctx');
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob(
          (blob) => {
            if (cancelled) return;
            if (!blob) {
              setPreviewUrl(masterUrl);
              setReady(true);
              return;
            }
            revokePrev();
            const url = URL.createObjectURL(blob);
            objectUrlRef.current = url;
            setPreviewUrl(url);
            setReady(true);
          },
          'image/jpeg',
          0.82,
        );
      } catch {
        // Tainted canvas / CORS — fall back to master.
        setPreviewUrl(masterUrl);
        setReady(true);
      }
    };

    img.onerror = () => {
      if (cancelled) return;
      setPreviewUrl(masterUrl);
      setReady(true);
    };

    img.src = masterUrl;

    return () => {
      cancelled = true;
    };
  }, [masterUrl]);

  // Final unmount cleanup
  useEffect(() => () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  return { previewUrl, ready };
}
