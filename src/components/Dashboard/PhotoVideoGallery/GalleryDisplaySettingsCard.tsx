import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/enhanced-button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Settings2, Save, LoaderCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { GalleryMeta, GalleryDisplaySettings } from '@/hooks/useEventMediaGallery';

interface Props {
  meta: GalleryMeta;
  onSave: (s: GalleryDisplaySettings) => Promise<void>;
}

const DEFAULT_DURATION = 8;
const MIN_DURATION = 3;
const MAX_DURATION = 60;

export const GalleryDisplaySettingsCard: React.FC<Props> = ({ meta, onSave }) => {
  const { toast } = useToast();
  const [title, setTitle] = useState(meta.gallery_title ?? '');
  const [welcome, setWelcome] = useState(meta.welcome_message ?? '');
  const [showDate, setShowDate] = useState<boolean>(meta.show_event_date);
  const [duration, setDuration] = useState<number>(meta.slideshow_photo_duration_sec ?? DEFAULT_DURATION);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTitle(meta.gallery_title ?? '');
    setWelcome(meta.welcome_message ?? '');
    setShowDate(meta.show_event_date);
    setDuration(meta.slideshow_photo_duration_sec ?? DEFAULT_DURATION);
  }, [meta.gallery_id, meta.gallery_title, meta.welcome_message, meta.show_event_date, meta.slideshow_photo_duration_sec]);

  const dirty =
    (title || '') !== (meta.gallery_title ?? '') ||
    (welcome || '') !== (meta.welcome_message ?? '') ||
    showDate !== meta.show_event_date ||
    duration !== (meta.slideshow_photo_duration_sec ?? DEFAULT_DURATION);

  const handleSave = async () => {
    const clamped = Math.max(MIN_DURATION, Math.min(MAX_DURATION, Math.round(duration || DEFAULT_DURATION)));
    setSaving(true);
    try {
      await onSave({
        gallery_title: title.trim() || null,
        welcome_message: welcome.trim() || null,
        show_event_date: showDate,
        slideshow_photo_duration_sec: clamped,
      });
      toast({ title: 'Display settings saved' });
    } catch (e: any) {
      toast({ title: 'Could not save', description: e?.message || 'Try again', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-5 space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-[#1D1D1F] flex items-center gap-2">
          <Settings2 className="h-5 w-5 text-[#967A59]" strokeWidth={1.8} /> Display settings
        </h2>
        <p className="text-sm text-muted-foreground">Customise what guests and the Live View see. Leave blank to keep defaults.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="md:col-span-2">
          <Label htmlFor="g-title" className="text-sm">Gallery title</Label>
          <Input
            id="g-title"
            className="h-11 mt-1.5"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Defaults to couple or event name"
            maxLength={120}
          />
          <p className="text-xs text-muted-foreground mt-1">Shown on the guest upload page and the Live View header.</p>
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="g-welcome" className="text-sm">Welcome message</Label>
          <Textarea
            id="g-welcome"
            className="mt-1.5 text-base"
            rows={3}
            value={welcome}
            onChange={(e) => setWelcome(e.target.value)}
            placeholder="Defaults to: Share your favourite photos and videos from today."
            maxLength={400}
          />
          <p className="text-xs text-muted-foreground mt-1">Shown to guests on the upload page.</p>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
          <div>
            <Label htmlFor="g-show-date" className="text-sm">Show event date</Label>
            <p className="text-xs text-muted-foreground mt-0.5">Display the event date on the guest upload page.</p>
          </div>
          <Switch id="g-show-date" checked={showDate} onCheckedChange={setShowDate} />
        </div>

        <div className="rounded-md border border-border p-3">
          <Label htmlFor="g-duration" className="text-sm">Live View photo duration (seconds)</Label>
          <Input
            id="g-duration"
            type="number"
            min={MIN_DURATION}
            max={MAX_DURATION}
            step={1}
            className="h-11 mt-1.5"
            value={duration}
            onChange={(e) => setDuration(parseInt(e.target.value, 10) || DEFAULT_DURATION)}
          />
          <p className="text-xs text-muted-foreground mt-1">Default 8s. Range {MIN_DURATION}–{MAX_DURATION}s. Videos always play in full.</p>
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          className="lv-premium-shade"
          variant="default"
          disabled={!dirty || saving}
          onClick={handleSave}
        >
          {saving ? <LoaderCircle className="h-4 w-4 mr-1 animate-spin" strokeWidth={1.8} /> : <Save className="h-4 w-4 mr-1" strokeWidth={1.8} />}
          Save display settings
        </Button>
      </div>
    </Card>
  );
};

export default GalleryDisplaySettingsCard;
