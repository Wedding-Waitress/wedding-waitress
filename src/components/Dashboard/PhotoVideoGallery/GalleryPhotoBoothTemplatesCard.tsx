// Photo Booth Customisation — background colour, custom template artwork,
// footer logo, footer fonts and custom footer text for the photo STRIP only.
// Individual photos are always saved as raw originals (no styling).
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/enhanced-button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Image as ImageIcon, Upload, X, Save, Loader2, RotateCcw, Palette, Type as TypeIcon, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { GalleryMeta, PhotoBoothTemplateSettings } from '@/hooks/useEventMediaGallery';
import { PhotoBoothTemplatePreview } from './PhotoBoothTemplatePreview';
import { PhotoBoothColorPicker } from './PhotoBoothColorPicker';
import {
  defaultBottomText, formatEventDate, PB_DEFAULT_STYLE,
  resolveStripStyle, type ComposeOpts, type PhotoBoothStripStyle,
  FOOTER_PANEL_WIDTH, FOOTER_PANEL_HEIGHT, footerPanelMm,
  validateFooterPanelSize, makeBlankFooterTemplate,
} from '@/lib/photoBoothTemplate';
import { isLibraryTemplateUrl, findLibraryTemplate } from '@/lib/photoBoothBackgroundTemplates';
import { PhotoBoothTemplateLibraryDialog } from './PhotoBoothTemplateLibraryDialog';



const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const LOGO_ACCEPT = 'image/png,image/jpeg,image/webp';
const TEMPLATE_ACCEPT = 'image/jpeg,.jpg,.jpeg';
const FOOTER_DISABLED_NOTE = 'A custom footer design is active. Remove it to use the text footer settings.';

/** Reads the real pixel dimensions of a picked image file. */
const readImageSize = (file: File) =>
  new Promise<{ width: number; height: number }>((res, rej) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); res({ width: img.naturalWidth, height: img.naturalHeight }); };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Could not read this image')); };
    img.src = url;
  });


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

/** Standard pixel sizes, 10px – 72px in 1px increments. */
const FONT_SIZES = Array.from({ length: 63 }, (_, i) => i + 10);

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
  const [libraryOpen, setLibraryOpen] = useState(false);

  /** Which background option is currently active — only one at a time. */
  const bgMode: 'colour' | 'library' | 'custom' =
    !tpl ? 'colour' : isLibraryTemplateUrl(tpl) ? 'library' : 'custom';

  /** The library template currently applied, if any. */
  const libraryTemplate = findLibraryTemplate(tpl);

  /** A complete custom footer design is active — it replaces the whole text footer. */
  const footerDesignActive = !!logo;
  const panelMm = footerPanelMm();

  const downloadBlankFooterTemplate = () => {
    const canvas = makeBlankFooterTemplate(true);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wedding-waitress-footer-template-${FOOTER_PANEL_WIDTH}x${FOOTER_PANEL_HEIGHT}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  };




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
    if (which === 'logo') {
      try {
        const { width, height } = await readImageSize(file);
        const check = validateFooterPanelSize(width, height);
        if (!check.ok) {
          toast({ title: 'Wrong footer size', description: check.message, variant: 'destructive' });
          if (logoInput.current) logoInput.current.value = '';
          return;
        }
      } catch {
        toast({ title: 'Could not read image', description: 'Try a different PNG, JPG or WebP file.', variant: 'destructive' });
        return;
      }
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

  const actionRow = (
    <div className="flex justify-between gap-2 flex-wrap pt-1">
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
  );

  return (
    <div className="space-y-6">
      {/* Page-level heading, directly on the brown page background */}
      <div className="text-center px-2 py-2 sm:py-4">
        <h2 className="text-2xl sm:text-3xl font-bold text-white">Custom Photo Booth Customisation</h2>
        <p className="text-sm text-white/85 mt-2 max-w-3xl mx-auto break-words">
          Customise the final photo strip only — background, footer logo, fonts and footer text. Individual photos are always saved as original raw photos.
        </p>
      </div>

      {/* ── Section 1: Photo Strip Background ───────────────────────────── */}
      <Card className="p-5 space-y-4">
        <div>
          <h3 className="text-base font-semibold text-[#1D1D1F] flex items-center gap-2">
            <Palette className="h-4 w-4 text-[#967A59]" /> Photo Strip Background
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Choose one background for the whole photo strip. The four photo positions and the footer stay on top.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
          {/* 1. Background colour */}
          <div className={`rounded-lg border bg-background p-3.5 flex flex-col gap-2 ${bgMode === 'colour' ? 'border-[#967A59] ring-2 ring-[#967A59]/20' : 'border-border'}`}>
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm font-semibold text-[#1D1D1F]">Background Colour</h4>
              {bgMode === 'colour' && <span className="text-[11px] font-semibold text-[#16A34A]">Active</span>}
            </div>
            <p className="text-xs text-muted-foreground lg:min-h-[72px]">
              A single solid colour behind the whole photo strip. Pick a shade or enter an exact colour code.
            </p>
            <div className="mt-auto space-y-2">
              <div className="w-full h-16 rounded-md border border-border overflow-hidden" style={{ backgroundColor: style.bgColor }} />
              <PhotoBoothColorPicker
                value={style.bgColor}
                onChange={(hex) => { setStyle(s => ({ ...s, bgColor: hex })); setTpl(null); }}
              />
              {bgMode !== 'colour' && (
                <Button type="button" variant="outline" size="sm" className="lv-premium-shade w-full h-9" onClick={() => setTpl(null)}>
                  Use this colour
                </Button>
              )}
            </div>
          </div>

          {/* 2. Template library */}
          <div className={`rounded-lg border bg-background p-3.5 flex flex-col gap-2 ${bgMode === 'library' ? 'border-[#967A59] ring-2 ring-[#967A59]/20' : 'border-border'}`}>
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm font-semibold text-[#1D1D1F]">Add Background Template</h4>
              {bgMode === 'library' && <span className="text-[11px] font-semibold text-[#16A34A]">Active</span>}
            </div>
            <p className="text-xs text-muted-foreground lg:min-h-[72px]">
              Wedding Waitress templates, ready to use. Browse the library to pick one.
            </p>
            <div className="mt-auto space-y-2">
              <div className="w-full h-16 rounded-md border border-border bg-muted/40 overflow-hidden flex flex-col items-center justify-center">
                {libraryTemplate ? (
                  <img src={libraryTemplate.thumbUrl} alt={libraryTemplate.name} loading="lazy" className="w-full h-full object-contain" />
                ) : (
                  <>
                    <ImageIcon className="h-5 w-5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground mt-1">No Template Selected</span>
                  </>
                )}
              </div>
              <Button type="button" variant="outline" size="sm" className="lv-premium-shade w-full h-9" onClick={() => setLibraryOpen(true)}>
                Browse Template Library
              </Button>
              {libraryTemplate && (
                <Button type="button" variant="outline" size="sm" className="lv-premium-shade w-full h-9 text-[#B42318]" onClick={() => setTpl(null)}>
                  Remove Template
                </Button>
              )}
            </div>
          </div>

          {/* 3. Custom template */}
          <div className={`rounded-lg border bg-background p-3.5 flex flex-col gap-2 ${bgMode === 'custom' ? 'border-[#967A59] ring-2 ring-[#967A59]/20' : 'border-border'}`}>
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm font-semibold text-[#1D1D1F]">Add Your Custom Template</h4>
              {bgMode === 'custom' && <span className="text-[11px] font-semibold text-[#16A34A]">Active</span>}
            </div>
            <p className="text-xs text-muted-foreground lg:min-h-[72px]">
              <span className="font-medium text-[#1D1D1F]">1440 × 2000 px</span> JPEG (.jpg / .jpeg), vertical, approx. 122 × 169 mm at 300 DPI. It becomes the complete background of the final two-strip image.
            </p>
            <div className="mt-auto space-y-2">
              <input
                ref={tplInput}
                type="file"
                accept={TEMPLATE_ACCEPT}
                className="hidden"
                onChange={(e) => upload('template', e.target.files?.[0] || null)}
              />
              <div className="relative w-full h-16 rounded-md border border-border bg-muted/40 overflow-hidden flex flex-col items-center justify-center">
                {customTpl ? (
                  <>
                    <img src={customTpl} alt="" className="w-full h-full object-contain bg-white" />
                    <button
                      type="button"
                      onClick={() => { setCustomTpl(null); if (bgMode === 'custom') setTpl(null); }}
                      className="absolute top-1.5 right-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full p-1"
                      aria-label="Remove"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </>
                ) : (
                  <>
                    <ImageIcon className="h-5 w-5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground mt-1">No Template Selected</span>
                  </>
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="lv-premium-shade w-full h-9"
                onClick={() => tplInput.current?.click()}
                disabled={uploading === 'template'}
              >
                {uploading === 'template'
                  ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Uploading…</>
                  : <><Upload className="h-4 w-4 mr-1" /> Choose File</>}
              </Button>
              {customTpl && bgMode !== 'custom' && (
                <Button type="button" variant="outline" size="sm" className="lv-premium-shade w-full h-9" onClick={() => setTpl(customTpl)}>
                  Use my custom template
                </Button>
              )}
            </div>
          </div>
        </div>

        {actionRow}

        <PhotoBoothTemplateLibraryDialog
          open={libraryOpen}
          onOpenChange={setLibraryOpen}
          selectedUrl={tpl}
          onSelect={(url) => setTpl(url)}
        />
      </Card>

      {/* ── Section 2: Live Preview ─────────────────────────────────────── */}
      <Card className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-3">
          <h3 className="text-base font-semibold text-[#1D1D1F] shrink-0">Live Photo Strip Preview</h3>
          <p className="text-xs text-muted-foreground break-words mt-1 sm:mt-0">
            {tpl ? 'Using your uploaded template artwork.' : 'Using your selected background colour and footer settings.'}
          </p>
        </div>

        <div className="mt-4 flex items-center justify-center">
          <div className="w-full max-w-[560px]">
            <PhotoBoothTemplatePreview kind="strip" opts={previewOpts} />
          </div>
        </div>
      </Card>

      {/* ── Section 3: Photo Strip Footer ───────────────────────────────── */}
      <Card className="p-5 space-y-4">
        <div>
          <h3 className="text-base font-semibold text-[#1D1D1F] flex items-center gap-2">
            <TypeIcon className="h-4 w-4 text-[#967A59]" /> Photo Strip Footer
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Everything that appears in the footer band under the four photos.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-stretch">
          {/* 1. Complete custom footer design */}
          <div className={`rounded-lg border bg-background p-3.5 flex flex-col gap-2 ${footerDesignActive ? 'border-[#967A59] ring-2 ring-[#967A59]/20' : 'border-border'}`}>
            <h4 className="text-sm font-semibold text-[#1D1D1F]">Upload Custom Footer Design</h4>
            <p className="text-xs text-muted-foreground">
              Upload one complete footer design using the exact dimensions below. It will fill the footer beneath one
              photo column and be duplicated automatically beneath both columns. When active, it replaces the event
              name, date and all text-footer settings.
            </p>
            <p className="text-xs">
              <span className="font-semibold text-[#1D1D1F]">
                Required size: {FOOTER_PANEL_WIDTH} × {FOOTER_PANEL_HEIGHT} px
              </span>
              <span className="text-muted-foreground"> (approx. {panelMm.w} × {panelMm.h} mm at 300 DPI)</span>
            </p>
            <p className="text-xs text-muted-foreground">
              Create one finished footer panel. It will be duplicated automatically beneath both photo-strip columns.
              PNG, JPG or WebP — use PNG when you need transparency.
            </p>
            <div className="mt-auto space-y-2">
              <ImageSlot
                label=""
                accept={LOGO_ACCEPT}
                url={logo}
                uploading={uploading === 'logo'}
                inputRef={logoInput}
                onPick={(f) => upload('logo', f)}
                onClear={() => setLogo(null)}
                aspect="contain"
                clearLabel="Remove Footer Design"
                replaceLabel="Replace Footer Design"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="lv-premium-shade w-full h-9"
                onClick={downloadBlankFooterTemplate}
              >
                <Download className="h-4 w-4 mr-1" /> Download Blank Footer Template
              </Button>
              <p className="text-xs text-muted-foreground">
                Keep important text and logos inside the recommended safe area.
              </p>
            </div>
          </div>

          <div className={`rounded-lg border border-border bg-background p-3.5 flex flex-col gap-2 ${footerDesignActive ? 'opacity-50 pointer-events-none select-none' : ''}`} aria-disabled={footerDesignActive}>
            <h4 className="text-sm font-semibold text-[#1D1D1F]">Custom Footer Text</h4>
            {footerDesignActive && <p className="text-xs font-medium text-[#B45309]">{FOOTER_DISABLED_NOTE}</p>}
            <Textarea
              className="min-h-[88px] text-base"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={fallbackText}
              maxLength={160}
              rows={3}
              disabled={footerDesignActive}
            />
            <p className="text-xs text-muted-foreground">
              Leave empty to show the event name and date: <span className="font-medium text-[#1D1D1F]">{fallbackText}</span>.
              Custom text fully replaces them; line breaks are preserved. The first line uses the Footer Header Font, later lines use the Footer Date Font.
            </p>
          </div>


          <div className={`rounded-lg border border-border bg-background p-3.5 space-y-3 ${footerDesignActive ? 'opacity-50 pointer-events-none select-none' : ''}`} aria-disabled={footerDesignActive}>
            <h4 className="text-sm font-semibold text-[#1D1D1F]">Footer Header Font</h4>
            {footerDesignActive && <p className="text-xs font-medium text-[#B45309]">{FOOTER_DISABLED_NOTE}</p>}

            <p className="text-xs text-muted-foreground">Event name, or the first line of your Custom Footer Text.</p>
            <div>
              <Label className="text-sm">Font family</Label>
              <Select value={style.nameFontFamily} onValueChange={(v) => setStyle(s => ({ ...s, nameFontFamily: v }))}>
                <SelectTrigger className="h-11 mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {FONT_OPTIONS.map(f => (
                    <SelectItem key={f} value={f}><span style={{ fontFamily: f }}>{f}</span></SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">Font colour</Label>
              <div className="mt-1.5">
                <PhotoBoothColorPicker value={style.nameColor} onChange={(hex) => setStyle(s => ({ ...s, nameColor: hex }))} />
              </div>
            </div>
            <div>
              <Label className="text-sm">Font size</Label>
              <Select value={String(style.nameSize)} onValueChange={(v) => setStyle(s => ({ ...s, nameSize: Number(v) }))}>
                <SelectTrigger className="h-11 mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {FONT_SIZES.map(n => <SelectItem key={n} value={String(n)}>{n}px</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className={`rounded-lg border border-border bg-background p-3.5 space-y-3 ${footerDesignActive ? 'opacity-50 pointer-events-none select-none' : ''}`} aria-disabled={footerDesignActive}>
            <h4 className="text-sm font-semibold text-[#1D1D1F]">Footer Date Font</h4>
            {footerDesignActive && <p className="text-xs font-medium text-[#B45309]">{FOOTER_DISABLED_NOTE}</p>}

            <p className="text-xs text-muted-foreground">Event date, or the second and later lines of your Custom Footer Text.</p>
            <div>
              <Label className="text-sm">Font family</Label>
              <Select value={style.dateFontFamily} onValueChange={(v) => setStyle(s => ({ ...s, dateFontFamily: v }))}>
                <SelectTrigger className="h-11 mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {FONT_OPTIONS.map(f => (
                    <SelectItem key={f} value={f}><span style={{ fontFamily: f }}>{f}</span></SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">Font colour</Label>
              <div className="mt-1.5">
                <PhotoBoothColorPicker value={style.dateColor} onChange={(hex) => setStyle(s => ({ ...s, dateColor: hex }))} />
              </div>
            </div>
            <div>
              <Label className="text-sm">Font size</Label>
              <Select value={String(style.dateSize)} onValueChange={(v) => setStyle(s => ({ ...s, dateSize: Number(v) }))}>
                <SelectTrigger className="h-11 mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {FONT_SIZES.map(n => <SelectItem key={n} value={String(n)}>{n}px</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {actionRow}
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
  replaceLabel?: string;
}

const ImageSlot: React.FC<ImageSlotProps> = ({ label, accept, url, uploading, inputRef, onPick, onClear, aspect, clearLabel, replaceLabel }) => (

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
        {uploading ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Uploading…</> : <><Upload className="h-4 w-4 mr-1" /> {url ? (replaceLabel || 'Replace') : 'Choose file'}</>}
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
