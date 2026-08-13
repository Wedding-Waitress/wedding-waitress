// Phase 3A — Bulk ZIP downloads for the host
import React, { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/enhanced-button';
import { Progress } from '@/components/ui/progress';
import { Download, LoaderCircle, FolderDown, TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GalleryItem } from '@/hooks/useEventMediaGallery';
import { useToast } from '@/hooks/use-toast';
import { publicGalleryItems } from '@/lib/mediaPrivacy';
import { sharedMediaFilename } from '@/lib/sharedPhotoFilename';
import { guestbookRecordingFilename } from '@/lib/audioGuestbookFilename';
import { photoBoothFilename } from '@/lib/photoBoothFilename';
import managementStyles from './photoVideoSharingManagement.module.css';

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

function entryNameFor(item: GalleryItem, used: Set<string>, eventName?: string | null): string {
  const folder = item.kind === 'video'
    ? (item.is_guestbook ? 'guestbook-video' : 'videos')
    : item.kind === 'audio'
      ? 'guestbook-voice'
      : 'photos';

  // Shared photos and shared videos use the customer-friendly "00001-Event-Name.ext" scheme.
  const shared = sharedMediaFilename(item as any, eventName)
    || guestbookRecordingFilename(item as any, eventName)
    || photoBoothFilename(item as any, eventName);
  if (shared) {
    let name = `${folder}/${shared}`;
    let i = 2;
    while (used.has(name)) {
      name = `${folder}/${shared.replace(/(\.[^.]+)$/, `-${i}$1`)}`;
      i++;
    }
    used.add(name);
    return name;
  }

  const who = slugify(item.uploader_name, 'guest');
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
  /** Optional overrides used by feature workspaces (e.g. Photo Booth). */
  scopes?: ZipScope[];
  labels?: Partial<Record<ZipScope, string>>;
  title?: string;
  description?: string;
  filePrefix?: string;
  emptyText?: string;
  /**
   * Privacy scope. 'public' (default) hard-strips private Guestbook content from every ZIP.
   * Only the organiser-only Guestbook workspaces may pass 'guestbook'.
   */
  privacyScope?: 'public' | 'guestbook';
  /**
   * Button layout. 'grid' (default) renders two columns; 'vertical' renders a full-width
   * single column stack.
   */
  layout?: 'grid' | 'vertical';
  /** Optional className for the outer card. */
  className?: string;
  appearance?: 'default' | 'espresso-glass';
}> = ({ items: itemsProp, eventName, galleryTitle, scopes: scopesProp, labels, title, description, filePrefix, emptyText, privacyScope = 'public', layout = 'grid', className, appearance = 'default' }) => {
  const { toast } = useToast();
  const isGlass = appearance === 'espresso-glass';
  const items = useMemo(
    () => (privacyScope === 'guestbook' ? itemsProp : publicGalleryItems(itemsProp)),
    [itemsProp, privacyScope],
  );
  const [busy, setBusy] = useState<ZipScope | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 });
  const [zipPct, setZipPct] = useState(0);

  const labelFor = (s: ZipScope) => labels?.[s] || SCOPE_LABEL[s];

  const counts = useMemo(() => ({
    all: filterFor('all', items).length,
    approved: filterFor('approved', items).length,
    photos: filterFor('photos', items).length,
    videos: filterFor('videos', items).length,
  }), [items]);

  const prefix = useMemo(() => {
    const base = slugify(galleryTitle || eventName, 'wedding') || 'wedding';
    return `${base}-${filePrefix || 'gallery'}`;
  }, [galleryTitle, eventName, filePrefix]);

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

    try {
      const { default: JSZip } = await import('jszip');
      const zip = new JSZip();
      const used = new Set<string>();
      let failures = 0;

      for (let i = 0; i < list.length; i++) {
        const item = list[i];
        try {
          const res = await fetch(item.signed_url!);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const blob = await res.blob();
          zip.file(entryNameFor(item, used, eventName), blob);
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

  const scopes: ZipScope[] = scopesProp ?? ['all', 'approved', 'photos', 'videos'];

  return (
    <Card className={cn('p-4 space-y-4 overflow-hidden h-full flex flex-col', isGlass && managementStyles.glassCard, className)} data-appearance={isGlass ? appearance : undefined}>
      <div className="flex items-start gap-2">
        <FolderDown className="h-5 w-5 text-[#967A59] shrink-0 mt-1" />
        <div className="min-w-0">
          <h3 className={cn('text-xl', isGlass ? 'font-semibold tracking-[-0.012em] leading-tight text-white' : 'font-bold text-black')} style={isGlass ? undefined : { color: '#000000' }}>{title || 'Download as ZIP'}</h3>
          <p className={cn('text-sm mt-1 break-words', isGlass && 'font-normal text-[#e8ddd2]')} style={isGlass ? undefined : { color: '#1a1a1a' }}>{description || 'Bundle uploaded media into a single ZIP file.'}</p>
        </div>
      </div>

      <div className={`gap-2 ${layout === 'vertical' ? 'flex flex-col' : 'grid grid-cols-1 sm:grid-cols-2'}`}>
        {scopes.map(scope => {
          const isBusy = busy === scope;
          const count = counts[scope];
          const disabled = !!busy || count === 0;
          return (
            <Button
              key={scope}
              variant="outline"
              className={cn('lv-premium-shade justify-between h-11 w-full gap-2', isGlass && 'border-[#967A59]', isGlass && managementStyles.galleryControl, isGlass && managementStyles.upperGlassControl)}
              onClick={() => buildZip(scope)}
              disabled={disabled}
              title={count === 0 ? 'No items available' : undefined}
            >
              <span className="flex items-center">
                {isBusy ? <LoaderCircle className="h-4 w-4 mr-2 animate-spin shrink-0" /> : <Download className="h-4 w-4 mr-2 shrink-0" />}
                <span className="whitespace-nowrap">{labelFor(scope)}</span>
              </span>
              <span className="text-xs text-muted-foreground shrink-0">{count}</span>
            </Button>
          );
        })}
      </div>


      {busy && (
        <div className="space-y-2 rounded-md border border-border bg-muted/30 p-3">
          <div className={cn('flex items-center justify-between text-xs text-muted-foreground', isGlass && '!text-[#e8ddd2]')}>
            <span>
              Preparing {labelFor(busy).replace('Download ', '').toLowerCase()} ZIP…
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
        <div className={cn('flex items-center gap-2 text-xs text-muted-foreground', isGlass && '!text-[#e8ddd2]')}>
          <TriangleAlert className="h-3.5 w-3.5" />
          {emptyText || 'No uploaded media yet — ZIP downloads will activate once guests upload.'}
        </div>
      )}
    </Card>
  );
};

export default GalleryDownloadsCard;
