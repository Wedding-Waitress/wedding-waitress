// Live preview of the current Photo Booth template (default or uploaded artwork).
import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  composeSingle,
  composeStrip,
  makePlaceholderPhoto,
  PB_STRIP_COUNT,
  type ComposeOpts,
} from '@/lib/photoBoothTemplate';

interface Props {
  kind: 'single' | 'strip';
  opts: ComposeOpts;
  /** Preview orientation for the single-photo template */
  portrait?: boolean;
}

export const PhotoBoothTemplatePreview: React.FC<Props> = ({ kind, opts, portrait = true }) => {
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [failed, setFailed] = useState(false);
  const lastUrl = useRef<string | null>(null);

  const key = JSON.stringify([kind, portrait, opts]);

  useEffect(() => {
    let cancelled = false;
    setBusy(true);
    setFailed(false);
    (async () => {
      try {
        const canvas =
          kind === 'strip'
            ? await composeStrip(Array.from({ length: PB_STRIP_COUNT }, (_, i) => makePlaceholderPhoto(i, true)), opts)
            : await composeSingle(makePlaceholderPhoto(0, portrait), opts);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        if (cancelled) return;
        if (lastUrl.current) lastUrl.current = null;
        setUrl(dataUrl);
      } catch {
        if (!cancelled) setFailed(true);
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return (
    <div className="rounded-md border border-border bg-[#F7F5F1] overflow-hidden flex items-center justify-center min-h-[280px] p-3">
      {busy && !url ? (
        <Loader2 className="h-5 w-5 animate-spin text-[#967A59]" />
      ) : failed ? (
        <p className="text-xs text-muted-foreground">Preview unavailable</p>
      ) : url ? (
        <img
          src={url}
          alt={kind === 'strip' ? 'Photo strip template preview' : 'Individual photo template preview'}
          className={`max-h-[520px] w-auto max-w-full object-contain shadow-sm ${busy ? 'opacity-60' : ''}`}
        />
      ) : null}
    </div>
  );
};

export default PhotoBoothTemplatePreview;
