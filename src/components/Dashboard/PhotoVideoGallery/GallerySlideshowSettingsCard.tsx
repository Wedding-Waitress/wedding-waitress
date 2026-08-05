// Live Slideshow settings — stored per event on event_media_galleries.
import React, { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/enhanced-button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings2, LoaderCircle, Check, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { GALLERY_ALBUMS, type GalleryMeta } from '@/hooks/useEventMediaGallery';
import {
  slideshowSettingsFromRow,
  SLIDE_DURATION_OPTIONS,
  type SlideshowSettings,
} from '@/lib/slideshowSettings';

interface Props {
  meta: GalleryMeta;
  value: SlideshowSettings;
  onChange: (s: SlideshowSettings) => void;
  onSave: (s: SlideshowSettings) => Promise<void>;
}

export const GallerySlideshowSettingsCard: React.FC<Props> = ({ meta, value, onChange, onSave }) => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const saved = useMemo(() => slideshowSettingsFromRow(meta), [meta]);

  const dirty = useMemo(
    () => JSON.stringify({ ...value, albums: [...value.albums].sort() }) !== JSON.stringify({ ...saved, albums: [...saved.albums].sort() }),
    [value, saved],
  );

  const set = <K extends keyof SlideshowSettings>(k: K, v: SlideshowSettings[K]) => onChange({ ...value, [k]: v });

  const toggleKind = (kind: 'include_photos' | 'include_videos', next: boolean) => {
    const other = kind === 'include_photos' ? value.include_videos : value.include_photos;
    if (!next && !other) {
      toast({ title: 'At least one media type must stay on', description: 'Keep photos or videos enabled.', variant: 'destructive' });
      return;
    }
    set(kind, next);
  };

  const toggleAlbum = (album: string) => {
    const has = value.albums.includes(album);
    set('albums', has ? value.albums.filter(a => a !== album) : [...value.albums, album]);
  };

  const save = async () => {
    setSaving(true);
    try {
      await onSave(value);
      toast({ title: 'Slideshow settings saved' });
    } catch (e: any) {
      toast({ title: 'Could not save settings', description: e?.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-5 sm:p-6 space-y-6 overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: '#000000' }}>
            <Settings2 size={22} strokeWidth={1.8} className="text-[#967A59] shrink-0" /> Slideshow Settings
          </h2>
          <p className="text-sm mt-1 break-words" style={{ color: '#1a1a1a' }}>
            Choose what appears on screen and how it plays. Colours and logo come from your Branding &amp; Theme settings.
          </p>
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${dirty ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
          {dirty ? 'Unsaved changes' : 'All changes saved'}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="rounded-xl border border-border p-4 space-y-4">
          <p className="text-sm font-semibold text-[#1D1D1F]">Media types</p>
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="ss-photos" className="text-sm">Include Photos</Label>
            <Switch id="ss-photos" checked={value.include_photos} onCheckedChange={(v) => toggleKind('include_photos', v)} />
          </div>
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="ss-videos" className="text-sm">Include Videos</Label>
            <Switch id="ss-videos" checked={value.include_videos} onCheckedChange={(v) => toggleKind('include_videos', v)} />
          </div>
          <p className="text-xs text-muted-foreground">At least one media type must always remain enabled.</p>
        </div>

        <div className="rounded-xl border border-border p-4 space-y-4">
          <p className="text-sm font-semibold text-[#1D1D1F]">Playback</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs uppercase tracking-wide text-[#6E6E73]">Display order</Label>
              <Select value={value.order} onValueChange={(v) => set('order', v as SlideshowSettings['order'])}>
                <SelectTrigger className="h-11 mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="shuffle">Shuffle</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wide text-[#6E6E73]">Slide duration</Label>
              <Select value={String(value.slide_duration_sec)} onValueChange={(v) => set('slide_duration_sec', Number(v))}>
                <SelectTrigger className="h-11 mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SLIDE_DURATION_OPTIONS.map(s => (
                    <SelectItem key={s} value={String(s)}>{s} seconds</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wide text-[#6E6E73]">Transition</Label>
              <Select value={value.transition} onValueChange={(v) => set('transition', v as SlideshowSettings['transition'])}>
                <SelectTrigger className="h-11 mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fade">Fade</SelectItem>
                  <SelectItem value="slide">Slide</SelectItem>
                  <SelectItem value="none">None</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="ss-caption" className="text-sm">Show guest name / caption</Label>
            <Switch id="ss-caption" checked={value.show_caption} onCheckedChange={(v) => set('show_caption', v)} />
          </div>
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="ss-loop" className="text-sm">Loop continuously</Label>
            <Switch id="ss-loop" checked={value.loop} onCheckedChange={(v) => set('loop', v)} />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border p-4 space-y-3">
        <p className="text-sm font-semibold text-[#1D1D1F]">Albums</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => set('albums', [])}
            className={`h-9 px-3 rounded-full text-sm border transition-colors ${value.albums.length === 0 ? 'bg-[#967A59] text-white border-[#967A59]' : 'bg-background text-[#1D1D1F] border-border hover:bg-muted'}`}
          >
            {value.albums.length === 0 && <Check className="h-3.5 w-3.5 mr-1 inline" />}All Albums
          </button>
          {GALLERY_ALBUMS.map(a => {
            const active = value.albums.includes(a);
            return (
              <button
                key={a}
                type="button"
                onClick={() => toggleAlbum(a)}
                className={`h-9 px-3 rounded-full text-sm border transition-colors ${active ? 'bg-[#967A59] text-white border-[#967A59]' : 'bg-background text-[#1D1D1F] border-border hover:bg-muted'}`}
              >
                {active && <Check className="h-3.5 w-3.5 mr-1 inline" />}{a}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">No albums selected means every album is shown.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button className="lv-premium-shade h-11" onClick={save} disabled={saving || !dirty}>
          {saving ? <LoaderCircle size={16} strokeWidth={1.8} className="mr-1.5 animate-spin" /> : <Save size={16} strokeWidth={1.8} className="mr-1.5" />} Save Settings
        </Button>
        {dirty && (
          <Button variant="outline" className="lv-premium-shade h-11" onClick={() => onChange(saved)} disabled={saving}>
            Discard changes
          </Button>
        )}
        <p className="text-xs text-muted-foreground">Only approved, visible media ever appears in the Live Slideshow.</p>
      </div>
    </Card>
  );
};

export default GallerySlideshowSettingsCard;
