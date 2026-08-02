// Phase 3A — Bulk ZIP downloads for the host
import React, { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/enhanced-button';
import { Progress } from '@/components/ui/progress';
import { Download, Loader2, FileArchive, AlertTriangle } from 'lucide-react';
import JSZip from 'jszip';
import type { GalleryItem } from '@/hooks/useEventMediaGallery';
import { useToast } from '@/hooks/use-toast';

type ZipScope = 'all' | 'approved' | 'photos' | 'videos';

function slugify(s: string | null | undefined, fallback = 'gallery'): string {
  const v = (s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return v || fallback;
}

function extOf(item: GalleryItem): string {
  const raw = (item.storage_path.split('.').pop() || '').split('?')[0].toLowerCase();
  if (raw && raw.length <= 5) return raw;
  if (item.kind === 'video') return 'mp4';
  if (item.kind === 'audio') return 'webm';
  return 'jpg';
}

function entryNameFor(item: GalleryItem, used: Set<string>): string {
  const who = slugify(item.uploader_name, 'guest');
  const folder = item.kind === 'video'
    ? (item.is_guestbook ? 'guestbook-video' : 'videos')
    : item.kind === 'audio'
      ? 'guestbook-voice'
      : 'photos';
  const base = `${who}-${item.id.slice(0, 8)}`;
  let name = `${folder}/${base}.${extOf(item)}`;
  let i = 2;
  while (used.has(name)) {
    name = `${folder}/${base}-${i}.${extOf(item)}`;
    i++;
  }
  used.add(name);
  return name;
}

function filterFor(scope: ZipScope, items: GalleryItem[]): GalleryItem[] {
  const uploaded = items.filter(i => !!i.signed_url);
  switch (scope) {
    case 'approved': return uploaded.filter(i => i.moderation_status === 'approved');
    case 'photos':   return uploaded.filter(i => i.kind === 'photo');
    case 'videos':   return uploaded.filter(i => i.kind === 'video');
    case 'all':
    default:         return uploaded;
  }
}

const SCOPE_LABEL: Record<ZipScope, string> = {
  all: 'Download All',
  approved: 'Download Approved Only',
  photos: 'Download Photos Only',
  videos: 'Download Videos Only',
};

const SCOPE_SUFFIX: Record<ZipScope, string> = {
  all: 'all',
  approved: 'approved',
  photos: 'photos',
  videos: 'videos',
};

export const GalleryDownloadsCard: React.FC<{
  items: GalleryItem[];
  eventName?: string | null;
  galleryTitle?: string | null;
}> = ({ items, eventName, galleryTitle }) => {
  const { toast } = useToast();
  const [busy, setBusy] = useState<ZipScope | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 });
  const [zipPct, setZipPct] = useState(0);

  const counts = useMemo(() => ({
    all: filterFor('all', items).length,
    approved: filterFor('approved', items).length,
    photos: filterFor('photos', items).length,
    videos: filterFor('videos', items).length,
  }), [items]);

  const prefix = useMemo(() => {
    const base = slugify(galleryTitle || eventName, 'wedding') || 'wedding';
    return `${base}-gallery`;
  }, [galleryTitle, eventName]);

  const buildZip = async (scope: ZipScope) => {
    if (busy) return;
    const list = filterFor(scope, items);
    if (list.length === 0) {
      toast({ title: 'Nothing to download', description: 'No items match this selection.', variant: 'destructive' });
      return;
    }

    setBusy(scope);
    setProgress({ done: 0, total: list.length });
    setZipPct(0);

    const zip = new JSZip();
    const used = new Set<string>();
    let failures = 0;

    try {
      for (let i = 0; i < list.length; i++) {
        const item = list[i];
        try {
          const res = await fetch(item.signed_url!);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const blob = await res.blob();
          zip.file(entryNameFor(item, used), blob);
        } catch {
          failures++;
        }
        setProgress({ done: i + 1, total: list.length });
      }

      if (Object.keys(zip.files).length === 0) {
        throw new Error('All files failed to download.');
      }

      const blob = await zip.generateAsync(
        { type: 'blob', compression: 'STORE' },
        (meta) => setZipPct(Math.round(meta.percent)),
      );

      const filename = `${prefix}-${SCOPE_SUFFIX[scope]}.zip`;
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
      setBusy(null);
      setProgress({ done: 0, total: 0 });
      setZipPct(0);
    }
  };

  const scopes: ZipScope[] = ['all', 'approved', 'photos', 'videos'];

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <FileArchive className="h-5 w-5 text-[#967A59]" />
        <div>
          <h3 className="text-xl font-bold text-black" style={{ color: '#000000' }}>Download as ZIP</h3>
          <p className="text-sm mt-1" style={{ color: '#1a1a1a' }}>Bundle uploaded media into a single ZIP file.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {scopes.map(scope => {
          const isBusy = busy === scope;
          const count = counts[scope];
          const disabled = !!busy || count === 0;
          return (
            <Button
              key={scope}
              variant="outline"
              className="lv-premium-shade justify-between h-11"
              onClick={() => buildZip(scope)}
              disabled={disabled}
              title={count === 0 ? 'No items available' : undefined}
            >
              <span className="flex items-center">
                {isBusy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                {SCOPE_LABEL[scope]}
              </span>
              <span className="text-xs text-muted-foreground">{count}</span>
            </Button>
          );
        })}
      </div>

      {busy && (
        <div className="space-y-2 rounded-md border border-border bg-muted/30 p-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Preparing {SCOPE_LABEL[busy].replace('Download ', '').toLowerCase()} ZIP…
              {progress.total > 0 && ` (${progress.done}/${progress.total} files)`}
            </span>
            <span>{zipPct > 0 ? `${zipPct}%` : ''}</span>
          </div>
          <Progress
            value={
              progress.total > 0 && progress.done < progress.total
                ? Math.round((progress.done / progress.total) * 100)
                : zipPct
            }
          />
        </div>
      )}

      {!busy && counts.all === 0 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <AlertTriangle className="h-3.5 w-3.5" />
          No uploaded media yet — ZIP downloads will activate once guests upload.
        </div>
      )}
    </Card>
  );
};

export default GalleryDownloadsCard;
