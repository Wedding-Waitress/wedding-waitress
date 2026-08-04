// Photo Booth Customisation — background colour, custom template artwork,
// footer logo, footer fonts and custom footer text for the photo STRIP only.
// Individual photos are always saved as raw originals (no styling).
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/enhanced-button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Image as ImageIcon, Upload, X, Save, Loader2, FileImage, RotateCcw, Palette, Type as TypeIcon, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { GalleryMeta, PhotoBoothTemplateSettings } from '@/hooks/useEventMediaGallery';
import { PhotoBoothTemplatePreview } from './PhotoBoothTemplatePreview';
import { PhotoBoothColorPicker } from './PhotoBoothColorPicker';
import {
  defaultBottomText, formatEventDate, PB_DEFAULT_STYLE,
  resolveStripStyle, type ComposeOpts, type PhotoBoothStripStyle,
} from '@/lib/photoBoothTemplate';
import { PHOTO_BOOTH_BACKGROUND_TEMPLATES, isLibraryTemplateUrl } from '@/lib/photoBoothBackgroundTemplates';


const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const LOGO_ACCEPT = 'image/png,image/jpeg,image/webp';
const TEMPLATE_ACCEPT = 'image/jpeg';

const FONT_OPTIONS = [
  'Inter',
  'Georgia',
  'Times New Roman',
  'Garamond',
  'Palatino Linotype',
  'Baskerville',
  'Arial',
  'Helvetica',
  'Verdana',
  'Trebuchet MS',
  'Tahoma',
  'Courier New',
];

interface Props {
  eventId: string;
  meta: GalleryMeta;
  eventName?: string | null;
  eventDate?: string | null;
  onSave: (kind: 'single' | 'strip', s: PhotoBoothTemplateSettings) => Promise<void>;
}

export const GalleryPhotoBoothTemplatesCard: React.FC<Props> = ({ eventId, meta, eventName, eventDate, onSave }) => {
  const { toast } = useToast();
  const dateText = formatEventDate(eventDate || null);
  const eventTitle = (eventName || '').trim();
  const fallbackText = defaultBottomText(eventTitle, dateText);
  const hashtag = meta.gallery_title?.startsWith('#') ? meta.gallery_title : undefined;

  const savedStyle = useMemo(() => resolveStripStyle(meta.photo_booth_strip_style), [meta.photo_booth_strip_style]);

  const [text, setText] = useState(meta.photo_booth_strip_bottom_text || '');
  const [logo, setLogo] = useState<string | null>(meta.photo_booth_strip_logo_url);
  const [tpl, setTpl] = useState<string | null>(meta.photo_booth_strip_template_url);
  const [customTpl, setCustomTpl] = useState<string | null>(
    isLibraryTemplateUrl(meta.photo_booth_strip_template_url) ? null : meta.photo_booth_strip_template_url,
  );
  const [style, setStyle] = useState<Required<PhotoBoothStripStyle>>(savedStyle);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<'logo' | 'template' | null>(null);
  const logoInput = useRef<HTMLInputElement>(null);
  const tplInput = useRef<HTMLInputElement>(null);

  /** Which background option is currently active — only one at a time. */
  const bgMode: 'colour' | 'library' | 'custom' =
    !tpl ? 'colour' : isLibraryTemplateUrl(tpl) ? 'library' : 'custom';

  useEffect(() => {
    setText(meta.photo_booth_strip_bottom_text || '');
    setLogo(meta.photo_booth_strip_logo_url);
    setTpl(meta.photo_booth_strip_template_url);
    setCustomTpl(isLibraryTemplateUrl(meta.photo_booth_strip_template_url) ? null : meta.photo_booth_strip_template_url);
    setStyle(savedStyle);
  }, [meta.photo_booth_strip_bottom_text, meta.photo_booth_strip_logo_url, meta.photo_booth_strip_template_url, savedStyle]);

  const dirty =
    (text || '') !== (meta.photo_booth_strip_bottom_text || '') ||
    (logo || null) !== (meta.photo_booth_strip_logo_url || null) ||
    (tpl || null) !== (meta.photo_booth_strip_template_url || null) ||
    JSON.stringify(style) !== JSON.stringify(savedStyle);

  const upload = async (which: 'logo' | 'template', file: File | null) => {
    if (!file) return;
    const allowed = (which === 'template' ? TEMPLATE_ACCEPT : LOGO_ACCEPT).split(',');
    const jpegOk = /\.(jpe?g)$/i.test(file.name) && (file.type === 'image/jpeg' || file.type === '');
    if (which === 'template' ? !jpegOk : !allowed.includes(file.type)) {
      toast({
        title: 'Unsupported file type',
        description: which === 'template'
          ? 'Background templates must be a JPEG file (.jpg or .jpeg). PNG, GIF and WebP are not accepted.'
          : 'Use a high-quality PNG or JPEG.',
        variant: 'destructive',
      });
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast({ title: 'Image too large', description: 'Max 8 MB', variant: 'destructive' });
      return;
    }
    setUploading(which);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error('Not signed in');
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${uid}/${eventId}/photobooth-strip-${which}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('event-media-branding').upload(path, file, { upsert: true, contentType: file.type || 'image/jpeg' });
      if (error) throw error;
      const { data: pub } = supabase.storage.from('event-media-branding').getPublicUrl(path);
      if (which === 'logo') setLogo(pub.publicUrl);
      else { setCustomTpl(pub.publicUrl); setTpl(pub.publicUrl); }

    } catch (e: any) {
      toast({ title: 'Upload failed', description: e?.message || 'Try again', variant: 'destructive' });
    } finally {
      setUploading(null);
      if (which === 'logo' && logoInput.current) logoInput.current.value = '';
      if (which === 'template' && tplInput.current) tplInput.current.value = '';
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave('strip', {
        bottom_text: text.trim() ? text : null,
        logo_url: logo || null,
        template_url: tpl || null,
        style,
      });
      toast({ title: 'Photo Booth customization saved' });
    } catch (e: any) {
      toast({ title: 'Could not save', description: e?.message || 'Try again', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setText('');
    setLogo(null);
    setTpl(null);
    setStyle({ ...PB_DEFAULT_STYLE });
  };

  const previewOpts: ComposeOpts = {
    title: eventTitle,
    dateText,
    hashtag,
    bottomText: text.trim() ? text : null,
    logoUrl: logo,
    templateUrl: tpl,
    showBranding: meta.show_branding,
    style,
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
    <Card className="p-5 space-y-6">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: '#000000' }}>
          <FileImage className="h-5 w-5 text-[#967A59] shrink-0" /> Photo Booth Customisation
        </h2>
        <p className="text-sm mt-1 break-words" style={{ color: '#1a1a1a' }}>
          Customise the final photo strip only — background, footer logo, fonts and footer text. Individual photos are always saved as original raw photos.
        </p>
      </div>

      {/* Photo Strip Background — colour / library template / custom template */}
      <section className="rounded-xl border border-border bg-muted/30 p-4 sm:p-5 space-y-4">
        <div>
          <h3 className="text-base font-semibold text-[#1D1D1F] flex items-center gap-2">
            <Palette className="h-4 w-4 text-[#967A59]" /> Photo Strip Background
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Choose one background for the whole photo strip. The four photo positions and the footer stay on top.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
          {/* 1. Background colour */}
          <div className={`rounded-lg border bg-background p-3 space-y-2 ${bgMode === 'colour' ? 'border-[#967A59] ring-2 ring-[#967A59]/20' : 'border-border'}`}>
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm font-semibold text-[#1D1D1F]">Background Colour</h4>
              {bgMode === 'colour' && <span className="text-[11px] font-semibold text-[#16A34A]">Active</span>}
            </div>
            <PhotoBoothColorPicker
              value={style.bgColor}
              onChange={(hex) => { setStyle(s => ({ ...s, bgColor: hex })); setTpl(null); }}
            />
            {bgMode !== 'colour' && (
              <Button type="button" variant="outline" size="sm" className="lv-premium-shade w-full" onClick={() => setTpl(null)}>
                Use this colour
              </Button>
            )}
          </div>

          {/* 2. Template library */}
          <div className={`rounded-lg border bg-background p-3 space-y-2 ${bgMode === 'library' ? 'border-[#967A59] ring-2 ring-[#967A59]/20' : 'border-border'}`}>
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm font-semibold text-[#1D1D1F]">Add Background Template</h4>
              {bgMode === 'library' && <span className="text-[11px] font-semibold text-[#16A34A]">Active</span>}
            </div>
            <p className="text-xs text-muted-foreground">Wedding Waitress templates, ready to use.</p>
            <div className="grid grid-cols-2 gap-2">
              {PHOTO_BOOTH_BACKGROUND_TEMPLATES.map((t) => {
                const selected = !!tpl && tpl.endsWith(t.url);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTpl(t.url)}
                    aria-pressed={selected}
                    className={`relative rounded-md border overflow-hidden text-left transition-transform hover:scale-[1.02] ${selected ? 'border-[#967A59] ring-2 ring-[#967A59]/30' : 'border-border'}`}
                  >
                    <img src={t.thumbUrl} alt={t.name} loading="lazy" width={288} height={400} className="w-full h-24 object-cover" />
                    {selected && (
                      <span className="absolute top-1 right-1 rounded-full bg-[#16A34A] p-0.5">
                        <Check className="h-3 w-3 text-white" />
                      </span>
                    )}
                    <span className="block px-1.5 py-1 text-[11px] text-[#1D1D1F] truncate">{t.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Custom template */}
          <div className={`rounded-lg border bg-background p-3 space-y-2 ${bgMode === 'custom' ? 'border-[#967A59] ring-2 ring-[#967A59]/20' : 'border-border'}`}>
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm font-semibold text-[#1D1D1F]">Add Your Custom Template</h4>
              {bgMode === 'custom' && <span className="text-[11px] font-semibold text-[#16A34A]">Active</span>}
            </div>
            <ul className="text-xs text-muted-foreground space-y-0.5">
              <li>• <span className="font-medium text-[#1D1D1F]">1440 × 2000 pixels</span></li>
              <li>• Approx. 122 × 169 mm at 300 DPI</li>
              <li>• Vertical orientation</li>
              <li>• JPEG file only (.jpg or .jpeg)</li>
            </ul>
            <p className="text-xs text-muted-foreground">
              Your uploaded JPEG becomes the complete background of the final two-strip image, with the guest photos placed over it. Proportions are preserved — nothing is stretched.
            </p>
            <ImageSlot
              label=""
              accept={TEMPLATE_ACCEPT}
              url={customTpl}
              uploading={uploading === 'template'}
              inputRef={tplInput}
              onPick={(f) => upload('template', f)}
              onClear={() => { setCustomTpl(null); if (bgMode === 'custom') setTpl(null); }}
              aspect="contain"
              clearLabel="Remove"
            />
            {customTpl && bgMode !== 'custom' && (
              <Button type="button" variant="outline" size="sm" className="lv-premium-shade w-full" onClick={() => setTpl(customTpl)}>
                Use my custom template
              </Button>
            )}
          </div>
        </div>
      </section>


      {/* 3. Footer image / logo */}
      <section className="space-y-2">
        <h3 className="text-base font-semibold text-[#1D1D1F]">Add Image or Logo in Footer</h3>
        <p className="text-xs text-muted-foreground">
          A transparent-background PNG works best. It appears only inside the footer area — never over the photos — centred and scaled to fit.
        </p>
        <div className="max-w-md">
          <ImageSlot
            label=""
            accept={LOGO_ACCEPT}
            url={logo}
            uploading={uploading === 'logo'}
            inputRef={logoInput}
            onPick={(f) => upload('logo', f)}
            onClear={() => setLogo(null)}
            aspect="contain"
            clearLabel="Remove footer image"
          />
        </div>
      </section>

      {/* 4. Font customization */}
      <section className="space-y-3">
        <h3 className="text-base font-semibold text-[#1D1D1F] flex items-center gap-2">
          <TypeIcon className="h-4 w-4 text-[#967A59]" /> Font Customisation
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-sm">Font family</Label>
            <Select value={style.fontFamily} onValueChange={(v) => setStyle(s => ({ ...s, fontFamily: v }))}>
              <SelectTrigger className="h-11 mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-72">
                {FONT_OPTIONS.map(f => (
                  <SelectItem key={f} value={f}><span style={{ fontFamily: f }}>{f}</span></SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm">Footer font colour</Label>
            <div className="mt-1.5">
              <PhotoBoothColorPicker value={style.fontColor} onChange={(hex) => setStyle(s => ({ ...s, fontColor: hex }))} />
            </div>
          </div>
          <div>
            <Label className="text-sm">Event name size — {style.nameSize}px</Label>
            <Slider
              className="mt-3"
              min={24} max={72} step={1}
              value={[style.nameSize]}
              onValueChange={([v]) => setStyle(s => ({ ...s, nameSize: v }))}
            />
          </div>
          <div>
            <Label className="text-sm">Event date size — {style.dateSize}px</Label>
            <Slider
              className="mt-3"
              min={16} max={56} step={1}
              value={[style.dateSize]}
              onValueChange={([v]) => setStyle(s => ({ ...s, dateSize: v }))}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          These settings also apply to your Custom Footer Text. Keep the event name larger than the date for the classic photo-booth look.
        </p>
      </section>

      {/* 5. Custom footer text */}
      <section className="space-y-2">
        <h3 className="text-base font-semibold text-[#1D1D1F]">Custom Footer Text</h3>
        <Textarea
          className="mt-1 min-h-[88px] text-base"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={fallbackText}
          maxLength={160}
          rows={3}
        />
        <p className="text-xs text-muted-foreground">
          Leave empty to show the event name and date: <span className="font-medium text-[#1D1D1F]">{fallbackText}</span>.
          Custom text fully replaces them; line breaks are preserved.
        </p>
      </section>

      <div className="rounded-md border border-border bg-muted/40 p-3 text-xs text-[#1D1D1F]">
        <p className="font-semibold mb-1">Recommended template dimensions</p>
        <ul className="space-y-0.5 text-[#6E6E73]">
          <li>• <span className="font-medium text-[#1D1D1F]">Side-by-side strip canvas:</span> 1440 × 2000 px (PNG or JPEG)</li>
        </ul>
      </div>

      <div className="flex justify-between gap-2 flex-wrap">
        <Button variant="outline" className="lv-premium-shade" onClick={handleReset} disabled={saving || !!uploading}>
          <RotateCcw className="h-4 w-4 mr-1" /> Reset to default
        </Button>
        <Button
          className="lv-premium-shade font-bold text-white border-0 bg-[#16A34A] hover:bg-[#15803D] active:bg-[#166534] active:translate-y-px shadow-[0_4px_10px_-2px_rgba(22,163,74,0.55),inset_0_1px_0_rgba(255,255,255,0.35)] active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.25)] transition-all"
          disabled={!dirty || saving || !!uploading}
          onClick={handleSave}
        >
          {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
          Save template
        </Button>
      </div>
    </Card>

    {/* Live preview — separate box, sticky on desktop */}
    <Card className="py-5 px-2.5 lg:sticky lg:top-24">
      <h2 className="text-xl font-bold" style={{ color: '#000000' }}>Live Preview</h2>
      <p className="text-sm mt-1 break-words" style={{ color: '#1a1a1a' }}>
        {tpl ? 'Using your uploaded template artwork.' : 'Using your selected background colour and footer settings.'}
      </p>
      <div className="mt-4 flex items-center justify-center">
        <div className="w-full max-w-[560px]">
          <PhotoBoothTemplatePreview kind="strip" opts={previewOpts} />
        </div>
      </div>
    </Card>

    </div>
  );
};


interface ImageSlotProps {
  label: string;
  accept: string;
  url: string | null;
  uploading: boolean;
  inputRef: React.RefObject<HTMLInputElement>;
  onPick: (f: File | null) => void;
  onClear: () => void;
  aspect: 'cover' | 'contain';
  clearLabel?: string;
}

const ImageSlot: React.FC<ImageSlotProps> = ({ label, accept, url, uploading, inputRef, onPick, onClear, aspect, clearLabel }) => (
  <div>
    {label && <Label className="text-sm">{label}</Label>}
    <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={(e) => onPick(e.target.files?.[0] || null)} />
    <div className="rounded-md border border-border bg-muted/40 overflow-hidden">
      {url ? (
        <div className="relative">
          <img src={url} alt="" className={`w-full h-32 ${aspect === 'cover' ? 'object-cover' : 'object-contain bg-white'}`} />
          <button
            type="button"
            onClick={onClear}
            className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1"
            aria-label={clearLabel || 'Remove'}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="h-32 flex flex-col items-center justify-center text-muted-foreground">
          <ImageIcon className="h-6 w-6 mb-1" />
          <span className="text-xs">No image</span>
        </div>
      )}
    </div>
    <div className="mt-2 flex gap-2 flex-wrap">
      <Button type="button" variant="outline" size="sm" className="lv-premium-shade flex-1 min-w-[140px]" onClick={() => inputRef.current?.click()} disabled={uploading}>
        {uploading ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Uploading…</> : <><Upload className="h-4 w-4 mr-1" /> {url ? 'Replace' : 'Choose file'}</>}
      </Button>
      {url && (
        <Button type="button" variant="outline" size="sm" className="lv-premium-shade" onClick={onClear}>
          <X className="h-4 w-4 mr-1" /> {clearLabel || 'Remove'}
        </Button>
      )}
    </div>
  </div>
);

export default GalleryPhotoBoothTemplatesCard;
