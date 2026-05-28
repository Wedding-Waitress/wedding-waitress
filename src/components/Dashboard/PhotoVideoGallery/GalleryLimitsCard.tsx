import React, { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/enhanced-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Pencil, Check, X, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatBytes } from '@/lib/mediaValidation';
import type { GalleryMeta } from '@/hooks/useEventMediaGallery';

// Sensible bounds — keep upload enforcement constraints intact.
const BOUNDS = {
  photos:   { min: 1,   max: 100000 },
  videos:   { min: 0,   max: 10000  },
  totalGb:  { min: 1,   max: 2000   }, // 1 GB – 2 TB
  photoMb:  { min: 1,   max: 100    },
  videoMb:  { min: 1,   max: 600    },
  videoSec: { min: 5,   max: 180    },
};

interface FormState {
  photos: number;
  videos: number;
  totalGb: number;
  photoMb: number;
  videoMb: number;
  videoSec: number;
}

function metaToForm(meta: GalleryMeta): FormState {
  return {
    photos: meta.max_photos,
    videos: meta.max_videos,
    totalGb: Math.round((meta.max_total_bytes / 1024 / 1024 / 1024) * 10) / 10,
    photoMb: Math.round(meta.max_photo_bytes / 1024 / 1024),
    videoMb: Math.round(meta.max_video_bytes / 1024 / 1024),
    videoSec: meta.max_video_duration_sec,
  };
}

function validate(form: FormState): Record<string, string> {
  const errs: Record<string, string> = {};
  const check = (k: keyof FormState, label: string, b: { min: number; max: number }) => {
    const v = form[k];
    if (!Number.isFinite(v)) errs[k] = `${label} is required`;
    else if (v < b.min) errs[k] = `${label} must be at least ${b.min}`;
    else if (v > b.max) errs[k] = `${label} must be ${b.max} or less`;
  };
  check('photos',   'Max photos',           BOUNDS.photos);
  check('videos',   'Max videos',           BOUNDS.videos);
  check('totalGb',  'Total storage (GB)',   BOUNDS.totalGb);
  check('photoMb',  'Max photo size (MB)',  BOUNDS.photoMb);
  check('videoMb',  'Max video size (MB)',  BOUNDS.videoMb);
  check('videoSec', 'Max video duration',   BOUNDS.videoSec);
  return errs;
}

export const GalleryLimitsCard: React.FC<{
  meta: GalleryMeta;
  onUpdate: (m: Partial<GalleryMeta>) => Promise<void>;
}> = ({ meta, onUpdate }) => {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<FormState>(() => metaToForm(meta));
  const [saving, setSaving] = useState(false);

  // Keep local form in sync when meta is reloaded (e.g. after save or external change).
  useEffect(() => {
    if (!editing) setForm(metaToForm(meta));
  }, [meta, editing]);

  const errors = useMemo(() => (editing ? validate(form) : {}), [form, editing]);
  const hasErrors = Object.keys(errors).length > 0;

  const startEdit = () => { setForm(metaToForm(meta)); setEditing(true); };
  const cancel = () => { setForm(metaToForm(meta)); setEditing(false); };

  const save = async () => {
    const errs = validate(form);
    if (Object.keys(errs).length > 0) {
      toast({ title: 'Please fix the highlighted fields', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      await onUpdate({
        max_photos: form.photos,
        max_videos: form.videos,
        max_total_bytes: Math.round(form.totalGb * 1024 * 1024 * 1024),
        max_photo_bytes: form.photoMb * 1024 * 1024,
        max_video_bytes: form.videoMb * 1024 * 1024,
        max_video_duration_sec: form.videoSec,
      });
      toast({ title: 'Limits saved' });
      setEditing(false);
    } catch (e: any) {
      toast({ title: 'Could not save limits', description: e?.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const set = <K extends keyof FormState>(k: K) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value === '' ? NaN : Number(e.target.value);
    setForm(prev => ({ ...prev, [k]: v }));
  };

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-[#1D1D1F]">Per-event limits</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Maximum photos, videos and storage allowed for this event's gallery.
          </p>
        </div>
        {!editing ? (
          <Button className="lv-premium-shade" variant="outline" size="sm" onClick={startEdit}>
            <Pencil className="h-4 w-4 mr-1" /> Edit
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button className="lv-premium-shade" variant="outline" size="sm" onClick={cancel} disabled={saving}>
              <X className="h-4 w-4 mr-1" /> Cancel
            </Button>
            <Button className="lv-premium-shade" size="sm" onClick={save} disabled={saving || hasErrors}>
              <Check className="h-4 w-4 mr-1" /> {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        )}
      </div>

      {editing ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <FieldNum label="Max photos"                  value={form.photos}   onChange={set('photos')}   bounds={BOUNDS.photos}   error={errors.photos} />
            <FieldNum label="Max videos"                  value={form.videos}   onChange={set('videos')}   bounds={BOUNDS.videos}   error={errors.videos} />
            <FieldNum label="Total storage (GB)"          value={form.totalGb}  onChange={set('totalGb')}  bounds={BOUNDS.totalGb}  step={0.5} error={errors.totalGb} />
            <FieldNum label="Max photo size (MB)"         value={form.photoMb}  onChange={set('photoMb')}  bounds={BOUNDS.photoMb}  error={errors.photoMb} />
            <FieldNum label="Max video size (MB, ≤600)"   value={form.videoMb}  onChange={set('videoMb')}  bounds={BOUNDS.videoMb}  error={errors.videoMb} />
            <FieldNum label="Max video duration (s, ≤180)" value={form.videoSec} onChange={set('videoSec')} bounds={BOUNDS.videoSec} error={errors.videoSec} />
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Videos MP4/MOV up to 600&nbsp;MB and 180&nbsp;s. Changes apply to new uploads immediately.
          </p>
        </>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-3">
          <ReadRow label="Max photos"        value={meta.max_photos.toLocaleString()} />
          <ReadRow label="Max videos"        value={meta.max_videos.toLocaleString()} />
          <ReadRow label="Total storage"     value={formatBytes(meta.max_total_bytes)} />
          <ReadRow label="Max photo size"    value={formatBytes(meta.max_photo_bytes)} />
          <ReadRow label="Max video size"    value={formatBytes(meta.max_video_bytes)} />
          <ReadRow label="Max video length"  value={`${meta.max_video_duration_sec} s`} />
        </div>
      )}
    </Card>
  );
};

const ReadRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="text-sm">
    <div className="text-muted-foreground text-xs">{label}</div>
    <div className="font-medium text-[#1D1D1F] mt-0.5 tabular-nums">{value}</div>
  </div>
);

const FieldNum: React.FC<{
  label: string;
  value: number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  bounds: { min: number; max: number };
  step?: number;
  error?: string;
}> = ({ label, value, onChange, bounds, step = 1, error }) => (
  <div>
    <Label className="text-xs">{label}</Label>
    <Input
      type="number"
      inputMode="decimal"
      min={bounds.min}
      max={bounds.max}
      step={step}
      value={Number.isFinite(value) ? value : ''}
      onChange={onChange}
      className={`h-11 mt-1 ${error ? 'border-red-400 focus-visible:ring-red-400' : ''}`}
    />
    {error && (
      <div className="mt-1 flex items-start gap-1 text-xs text-red-600">
        <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" /> <span>{error}</span>
      </div>
    )}
  </div>
);
