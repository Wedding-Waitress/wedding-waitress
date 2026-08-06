import React, { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { TriangleAlert, AlertCircle, Image as ImageIcon, Video, HardDrive, UsersRound, BarChart3 } from 'lucide-react';
import { formatBytes } from '@/lib/mediaValidation';
import type { GalleryMeta, GalleryItem } from '@/hooks/useEventMediaGallery';

interface Props {
  meta: GalleryMeta;
  items: GalleryItem[];
}

export const GalleryUsageCard: React.FC<Props> = ({ meta, items }) => {
  const usage = useMemo(() => {
    let photos = 0, videos = 0, bytes = 0;
    const guests = new Set<string>();
    for (const i of items) {
      if (i.kind === 'photo') photos++;
      else if (i.kind === 'video') videos++;
      bytes += i.byte_size || 0;
      const who = (i.uploader_name || '').trim().toLowerCase();
      if (who) guests.add(who);
    }
    return { photos, videos, bytes, guests: guests.size };
  }, [items]);

  const photoPct = meta.max_photos > 0 ? Math.min(100, (usage.photos / meta.max_photos) * 100) : 0;
  const videoPct = meta.max_videos > 0 ? Math.min(100, (usage.videos / meta.max_videos) * 100) : 0;
  const storagePct = meta.max_total_bytes > 0 ? Math.min(100, (usage.bytes / meta.max_total_bytes) * 100) : 0;
  const remainingBytes = Math.max(0, meta.max_total_bytes - usage.bytes);

  const storageFull = usage.bytes >= meta.max_total_bytes;
  const photosFull = usage.photos >= meta.max_photos;
  const videosFull = usage.videos >= meta.max_videos;
  const anyFull = storageFull || photosFull || videosFull;
  const storageWarn = !storageFull && storagePct >= 80;

  return (
    <Card className="h-full p-4 sm:p-5 overflow-hidden">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h2 className="text-xl font-bold text-black flex items-center gap-2" style={{ color: '#000000' }}><BarChart3 className="h-5 w-5 text-[#967A59] shrink-0" /> Gallery Usage</h2>
          <p className="text-sm mt-1 break-words" style={{ color: '#1a1a1a' }}>View photo, video and storage usage for this event.</p>
        </div>
        <HardDrive className="h-5 w-5 text-[#967A59] shrink-0" />
      </div>


      {anyFull && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            <div className="font-medium">Gallery limit reached</div>
            <div className="text-xs mt-0.5">
              {[
                photosFull && 'photos',
                videosFull && 'videos',
                storageFull && 'storage',
              ].filter(Boolean).join(', ')} at maximum. Guests cannot upload more until you delete items or raise the limits below.
            </div>
          </div>
        </div>
      )}
      {!anyFull && storageWarn && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          <TriangleAlert className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            <div className="font-medium">Storage over 80%</div>
            <div className="text-xs mt-0.5">You have {formatBytes(remainingBytes)} remaining. Consider raising the storage limit or deleting items.</div>
          </div>
        </div>
      )}

      <div className="space-y-5">
        <Bar
          icon={<ImageIcon className="h-4 w-4 text-[#967A59]" />}
          label="Photos"
          value={`${usage.photos} / ${meta.max_photos}`}
          pct={photoPct}
          full={photosFull}
        />
        <Bar
          icon={<Video className="h-4 w-4 text-[#967A59]" />}
          label="Videos"
          value={`${usage.videos} / ${meta.max_videos}`}
          pct={videoPct}
          full={videosFull}
        />
        <Bar
          icon={<HardDrive className="h-4 w-4 text-[#967A59]" />}
          label="Storage"
          value={`${formatBytes(usage.bytes)} / ${formatBytes(meta.max_total_bytes)}`}
          pct={storagePct}
          full={storageFull}
          warn={storageWarn}
          sub={`${formatBytes(remainingBytes)} remaining`}
        />
        <div className="flex justify-center pt-1">
          <div className="inline-flex items-center justify-center gap-2 rounded-full border border-[#472c1d] bg-white px-4 py-2.5 text-sm select-none" aria-label={`${usage.guests} guests uploaded`}>
            <UsersRound className="h-4 w-4 text-[#967A59] shrink-0" aria-hidden="true" />
            <span className="font-medium text-foreground">Guests who uploaded</span>
            <span className="text-foreground font-medium tabular-nums">{usage.guests}</span>
          </div>
        </div>
      </div>
    </Card>
  );
};

const Bar: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  pct: number;
  full?: boolean;
  warn?: boolean;
  sub?: string;
}> = ({ icon, label, value, pct, full, warn, sub }) => {
  const indicatorClass = full
    ? '[&>div]:bg-gradient-to-r [&>div]:from-[#dc2626] [&>div]:to-[#991b1b]'
    : warn
      ? '[&>div]:bg-gradient-to-r [&>div]:from-[#E0B66A] [&>div]:to-[#B0832E]'
      : '[&>div]:bg-gradient-to-r [&>div]:from-[#C9A87A] [&>div]:to-[#967A59]';
  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-1.5 text-sm">
        <span className="flex items-center gap-2 font-medium text-foreground min-w-0"><span className="shrink-0">{icon}</span><span className="truncate">{label}</span></span>
        <span className="text-foreground font-medium tabular-nums shrink-0 text-right">{value}</span>
      </div>
      <Progress value={pct} className={`h-2 bg-[#E8E1D6]/50 ${indicatorClass}`} />

      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
};
