// Compact "Download All Guestbook Messages" ZIP button used inside the Guestbook Messages toolbar.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/enhanced-button';
import { Download, LoaderCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { GalleryItem } from '@/hooks/useEventMediaGallery';
import { guestbookRecordingFilename } from '@/lib/audioGuestbookFilename';
import { cn } from '@/lib/utils';
import managementStyles from './photoVideoSharingManagement.module.css';
import type { GuestbookPdfMessage } from '@/lib/guestbookMessagePdf';
import { guestbookPdfFilename } from '@/lib/guestbookFilename';

function slugify(s: string | null | undefined, fallback = 'guestbook'): string {
  const v = (s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return v || fallback;
}

function extOf(item: GalleryItem): string {
  const raw = (item.storage_path.split('.').pop() || '').split('?')[0].toLowerCase();
  if (raw && raw.length <= 5) return raw;
  return item.kind === 'video' ? 'mp4' : 'webm';
}

export const GuestbookDownloadAllButton: React.FC<{
  items: GalleryItem[];
  eventName?: string | null;
  eventDate?: string | null;
  writtenMessages?: GuestbookPdfMessage[];
  disabled?: boolean;
  stacked?: boolean;
  className?: string;
  label?: string;
  appearance?: 'default' | 'espresso-glass';
}> = ({ items, eventName, eventDate, writtenMessages = [], disabled = false, stacked = false, className, label = 'Download All Guestbook Messages', appearance = 'default' }) => {
  const isGlass = appearance === 'espresso-glass';
  const { toast } = useToast();
  const flight = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const source = JSON.stringify([eventName, eventDate, writtenMessages, items.map(i => [i.id, i.signed_url])]);
  const sourceRef = useRef(source); sourceRef.current = source;
  const [busy, setBusy] = useState(false);

  const list = useMemo(() => items.filter(i => !!i.signed_url), [items]);

  const run = async () => {
    if (flight.current || disabled) return;
    if (list.length + writtenMessages.length === 0) {
      toast({ title: 'Nothing to download', description: 'No guestbook messages available yet.', variant: 'destructive' });
      return;
    }
    const current = () => mounted.current && sourceRef.current === source;
    flight.current = true;
    setBusy(true);
    try {
      const { default: JSZip } = await import('jszip');
      if (!current()) return;
      const zip = new JSZip();
      const used = new Set<string>();
      let failures = 0;
      const uniqueName = (folder: string, base: string) => {
        let name = `${folder}/${base}`;
        let suffix = 2;
        while (used.has(name)) name = `${folder}/${base.replace(/(\.[^.]+)$/, `-${suffix++}$1`)}`;
        used.add(name);
        return name;
      };

      if (writtenMessages.length) {
        const { createGuestbookMessagePdf } = await import('@/lib/guestbookMessagePdf');
        for (const message of writtenMessages) {
          if (!current()) return;
          try {
            const pdf = await createGuestbookMessagePdf(message, { name: eventName, date: eventDate });
            if (!current()) return;
            zip.file(uniqueName('guestbook-written', guestbookPdfFilename(message.seq, eventName, eventDate)), pdf.output('arraybuffer'));
          } catch { failures++; }
        }
      }

      for (const item of list) {
        if (!current()) return;
        try {
          const res = await fetch(item.signed_url!);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const blob = await res.blob();
          const folder = item.kind === 'video' ? 'guestbook-video' : 'guestbook-voice';
          const base = guestbookRecordingFilename(item as any, eventName)
            || `${slugify(item.uploader_name, 'guest')}-${item.id.slice(0, 8)}.${extOf(item)}`;
          let name = `${folder}/${base}`;
          let i = 2;
          while (used.has(name)) {
            name = `${folder}/${base.replace(/(\.[^.]+)$/, `-${i}$1`)}`;
            i++;
          }
          used.add(name);
          zip.file(name, blob);
        } catch {
          failures++;
        }
      }
      if (![...used].some(name => !!zip.files[name])) throw new Error('All messages failed to download.');
      const blob = await zip.generateAsync({ type: 'blob', compression: 'STORE' });
      if (!current()) return;
      const filename = `${slugify(eventName, 'wedding')}-guestbook-messages.zip`;
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
      if (!current()) return;
      toast({ title: 'ZIP failed', description: e?.message || 'Please try again.', variant: 'destructive' });
    } finally {
      flight.current = false;
      if (!mounted.current) return;
      setBusy(false);
    }
  };

  return (
    <Button
      variant="outline"
      className={cn('lv-premium-shade h-11 gap-2 border border-[#472c1d]', className, isGlass && managementStyles.galleryControl, isGlass && managementStyles.upperGlassControl)}
      onClick={run}
      disabled={disabled || busy || list.length + writtenMessages.length === 0}
      aria-label={label === 'Download All' ? 'Download all guestbook messages' : label}
      data-guestbook-download={stacked ? 'stacked' : undefined}
    >
      {busy ? <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={1.8} /> : <Download className="h-4 w-4" strokeWidth={1.8} />}
      <span>{label}{stacked && <>{' '}<span className="block">({list.length + writtenMessages.length})</span></>}</span>
      {!stacked && <span className={cn('text-xs text-muted-foreground', appearance === 'espresso-glass' && managementStyles.gallerySecondaryText)}>{list.length + writtenMessages.length}</span>}
    </Button>
  );
};

export default GuestbookDownloadAllButton;
