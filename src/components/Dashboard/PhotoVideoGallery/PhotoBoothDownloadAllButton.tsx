// Digital Photo Booth: single "Download All" ZIP action shown in the captures header.
import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/enhanced-button';
import { FolderDown, LoaderCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { GalleryItem } from '@/hooks/useEventMediaGallery';
import { groupPhotoBoothSessions, boothSetPrefix } from '@/lib/photoBoothSessions';
import { photoBoothFilename } from '@/lib/photoBoothFilename';
import { cn } from '@/lib/utils';
import managementStyles from './photoVideoSharingManagement.module.css';

function slugify(s: string | null | undefined, fallback = 'photo-booth'): string {
  const v = (s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return v || fallback;
}

function extOf(item: GalleryItem): string {
  const raw = (item.storage_path.split('.').pop() || '').split('?')[0].toLowerCase();
  return raw && raw.length <= 5 ? raw : 'jpg';
}

export const PhotoBoothDownloadAllButton: React.FC<{
  items: GalleryItem[];
  eventName?: string | null;
  galleryTitle?: string | null;
  className?: string;
  appearance?: 'default' | 'espresso-glass';
}> = ({ items, eventName, galleryTitle, className, appearance = 'default' }) => {
  const isGlass = appearance === 'espresso-glass';
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(0);

  const sessions = useMemo(
    () => groupPhotoBoothSessions(items.filter(i => !!i.signed_url)),
    [items],
  );
  const total = useMemo(() => sessions.reduce((n, s) => n + s.items.length, 0), [sessions]);

  const run = async () => {
    if (busy || total === 0) return;
    setBusy(true);
    setDone(0);
    try {
      const { default: JSZip } = await import('jszip');
      const zip = new JSZip();
      let failures = 0;
      let count = 0;

      for (const session of sessions) {
        const folder = `set-${String(session.index).padStart(3, '0')}`;
        let individual = 0;
        for (const item of session.items) {
          const isStrip = !!item.is_photo_booth_strip;
          if (!isStrip) individual += 1;
          const prefix = boothSetPrefix(isStrip ? 0 : individual, isStrip);
          const friendly = photoBoothFilename(item as any, eventName)
            || `${item.id.slice(0, 8)}.${extOf(item)}`;
          try {
            const res = await fetch(item.signed_url!);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            zip.file(`${folder}/${prefix}-${friendly}`, await res.blob());
          } catch {
            failures++;
          }
          count += 1;
          setDone(count);
        }
      }

      if (Object.keys(zip.files).length === 0) throw new Error('All files failed to download.');

      const blob = await zip.generateAsync({ type: 'blob', compression: 'STORE' });
      const filename = `${slugify(galleryTitle || eventName, 'wedding')}-photo-booth-all.zip`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);

      toast({
        title: 'ZIP ready',
        description: failures
          ? `${filename} downloaded (${failures} file${failures === 1 ? '' : 's'} skipped).`
          : `${filename} downloaded.`,
      });
    } catch (e: any) {
      toast({
        title: 'ZIP failed',
        description: e?.message || 'Could not prepare ZIP. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
      setDone(0);
    }
  };

  return (
    <Button
      variant="outline"
      className={cn('lv-premium-shade h-11 gap-2 justify-between w-full sm:w-auto', className, isGlass && managementStyles.galleryControl, isGlass && managementStyles.upperGlassControl)}
      onClick={run}
      disabled={busy || total === 0}
      aria-label="Download all Photo Booth photos and videos"
      title={total === 0 ? 'No captures available' : undefined}
    >
      <span className="flex items-center">
        {busy ? <LoaderCircle className="h-4 w-4 mr-2 animate-spin shrink-0" strokeWidth={1.8} /> : <FolderDown className="h-4 w-4 mr-2 shrink-0" strokeWidth={1.8} />}
        <span className="whitespace-nowrap">Download All</span>
      </span>
      <span className="text-xs text-muted-foreground shrink-0">{busy && done > 0 ? `${done}/${total}` : total}</span>
    </Button>
  );
};

export default PhotoBoothDownloadAllButton;
