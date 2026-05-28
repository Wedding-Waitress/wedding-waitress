import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/enhanced-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import type { GalleryMeta } from '@/hooks/useEventMediaGallery';

export const GalleryLimitsCard: React.FC<{
  meta: GalleryMeta;
  onUpdate: (m: Partial<GalleryMeta>) => Promise<void>;
}> = ({ meta, onUpdate }) => {
  const { toast } = useToast();
  const [photos, setPhotos] = useState(meta.max_photos);
  const [videos, setVideos] = useState(meta.max_videos);
  const [totalGb, setTotalGb] = useState(Math.round((meta.max_total_bytes / 1024 / 1024 / 1024) * 10) / 10);
  const [videoMb, setVideoMb] = useState(Math.round(meta.max_video_bytes / 1024 / 1024));
  const [videoSec, setVideoSec] = useState(meta.max_video_duration_sec);
  const [photoMb, setPhotoMb] = useState(Math.round(meta.max_photo_bytes / 1024 / 1024));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await onUpdate({
        max_photos: photos,
        max_videos: videos,
        max_total_bytes: Math.round(totalGb * 1024 * 1024 * 1024),
        max_video_bytes: Math.min(videoMb, 250) * 1024 * 1024,
        max_video_duration_sec: Math.min(videoSec, 180),
        max_photo_bytes: photoMb * 1024 * 1024,
      });
      toast({ title: 'Limits saved' });
    } finally { setSaving(false); }
  };

  return (
    <Card className="p-5">
      <h2 className="text-lg font-semibold text-[#1D1D1F] mb-4">Per-event limits</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div><Label>Max photos</Label><Input type="number" min={1} value={photos} onChange={e => setPhotos(+e.target.value || 0)} className="h-11" /></div>
        <div><Label>Max videos</Label><Input type="number" min={0} value={videos} onChange={e => setVideos(+e.target.value || 0)} className="h-11" /></div>
        <div><Label>Total storage (GB)</Label><Input type="number" min={1} step={0.5} value={totalGb} onChange={e => setTotalGb(+e.target.value || 0)} className="h-11" /></div>
        <div><Label>Max photo (MB)</Label><Input type="number" min={1} max={100} value={photoMb} onChange={e => setPhotoMb(+e.target.value || 0)} className="h-11" /></div>
        <div><Label>Max video (MB, ≤100)</Label><Input type="number" min={1} max={100} value={videoMb} onChange={e => setVideoMb(+e.target.value || 0)} className="h-11" /></div>
        <div><Label>Max video duration (s, ≤180)</Label><Input type="number" min={1} max={180} value={videoSec} onChange={e => setVideoSec(+e.target.value || 0)} className="h-11" /></div>
      </div>
      <div className="mt-4"><Button className="lv-premium-shade" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save limits'}</Button></div>
      <p className="text-xs text-muted-foreground mt-3">Phase 1: videos are capped to 100&nbsp;MB and 180&nbsp;s (MP4/MOV only).</p>
    </Card>
  );
};
