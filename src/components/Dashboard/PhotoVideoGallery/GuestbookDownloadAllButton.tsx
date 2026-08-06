// Compact "Download All Guestbook Messages" ZIP button used inside the Guestbook Messages toolbar.
import React, { useMemo, useState } from 'react';
import JSZip from 'jszip';
import { Button } from '@/components/ui/enhanced-button';
import { Download, LoaderCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { GalleryItem } from '@/hooks/useEventMediaGallery';
import { guestbookRecordingFilename } from '@/lib/audioGuestbookFilename';

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
  className?: string;
}> = ({ items, eventName, className }) => {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const list = useMemo(() => items.filter(i => !!i.signed_url), [items]);

  const run = async () => {
    if (busy) return;
    if (list.length === 0) {
      toast({ title: 'Nothing to download', description: 'No recordings available yet.', variant: 'destructive' });
      return;
    }
    setBusy(true);
    const zip = new JSZip();
    const used = new Set<string>();
    let failures = 0;
    try {
      for (const item of list) {
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
      if (Object.keys(zip.files).length === 0) throw new Error('All files failed to download.');
      const blob = await zip.generateAsync({ type: 'blob', compression: 'STORE' });
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
      toast({ title: 'ZIP failed', description: e?.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      variant="outline"
      className={`lv-premium-shade h-11 gap-2 border border-[#472c1d] ${className || ''}`}
      onClick={run}
      disabled={busy || list.length === 0}
    >
      {busy ? <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={1.8} /> : <Download className="h-4 w-4" strokeWidth={1.8} />}
      <span>Download All Guestbook Messages</span>
      <span className="text-xs text-muted-foreground">{list.length}</span>
    </Button>
  );
};

export default GuestbookDownloadAllButton;
