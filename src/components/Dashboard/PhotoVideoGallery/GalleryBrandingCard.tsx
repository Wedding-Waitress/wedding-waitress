import React, { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/enhanced-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Palette, Save, LoaderCircle, Upload, X, ImagePlus, Images, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { GalleryMeta, GalleryBrandingSettings } from '@/hooks/useEventMediaGallery';
import { DEFAULT_THEME_COLOR } from '@/lib/galleryTheme';
import { GalleryBackgroundGalleryModal } from './GalleryBackgroundGalleryModal';
import { GalleryBackgroundColorPicker } from './GalleryBackgroundColorPicker';
import { normalizeHexColor } from '@/lib/backgroundColorPalette';
import canvaLogo from '@/assets/canva-logo.png';

interface Props {
  eventId: string;
  meta: GalleryMeta;
  onSave: (b: GalleryBrandingSettings) => Promise<void>;
}

type BgMode = 'preset' | 'color' | 'image';

const BG_OPTIONS: { value: 'light' | 'dark' | 'cream'; label: string; sample: string }[] = [
  { value: 'cream', label: 'Soft cream', sample: '#F8F5F0' },
  { value: 'light', label: 'Light', sample: '#FFFFFF' },
  { value: 'dark',  label: 'Dark',  sample: '#0B0B0B' },
];

const DEFAULT_BG_COLOR = '#F8F5F0';
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ACCEPT = 'image/jpeg,image/png,image/webp';

export const GalleryBrandingCard: React.FC<Props> = ({ eventId, meta, onSave }) => {
  const { toast } = useToast();
  const [bg, setBg] = useState<'light' | 'dark' | 'cream'>(meta.background_style || 'cream');
  const [bgMode, setBgMode] = useState<BgMode>(meta.background_mode || 'preset');
  const [bgColor, setBgColor] = useState<string>(meta.background_color || DEFAULT_BG_COLOR);
  const [bgImageUrl, setBgImageUrl] = useState<string | null>(meta.background_image_url || null);
  const [coverUrl, setCoverUrl] = useState<string | null>(meta.cover_image_url || null);
  const [logoUrl, setLogoUrl] = useState<string | null>(meta.logo_image_url || null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<'cover' | 'logo' | 'background' | null>(null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const coverInput = useRef<HTMLInputElement>(null);
  const logoInput = useRef<HTMLInputElement>(null);
  const bgInput = useRef<HTMLInputElement>(null);
  const [hexDraft, setHexDraft] = useState<string>(meta.background_color || DEFAULT_BG_COLOR);
  const [hexError, setHexError] = useState<string | null>(null);

  useEffect(() => {
    setBg(meta.background_style || 'cream');
    setBgMode(meta.background_mode || 'preset');
    setBgColor(meta.background_color || DEFAULT_BG_COLOR);
    setHexDraft(meta.background_color || DEFAULT_BG_COLOR);
    setHexError(null);
    setBgImageUrl(meta.background_image_url || null);
    setCoverUrl(meta.cover_image_url || null);
    setLogoUrl(meta.logo_image_url || null);
  }, [
    meta.gallery_id, meta.background_style, meta.background_mode, meta.background_color,
    meta.background_image_url, meta.cover_image_url, meta.logo_image_url,
  ]);

  const dirty =
    bg !== (meta.background_style || 'cream') ||
    bgMode !== (meta.background_mode || 'preset') ||
    (bgMode === 'color' && bgColor !== (meta.background_color || DEFAULT_BG_COLOR)) ||
    (bgImageUrl || null) !== (meta.background_image_url || null) ||
    (coverUrl || null) !== (meta.cover_image_url || null) ||
    (logoUrl || null) !== (meta.logo_image_url || null);

  const uploadImage = async (kind: 'cover' | 'logo' | 'background', file: File | null) => {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      toast({ title: 'Unsupported file type', description: 'Use JPG, PNG, or WebP', variant: 'destructive' });
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast({ title: 'Image too large', description: 'Max 5 MB', variant: 'destructive' });
      return;
    }
    setUploading(kind);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error('Not signed in');
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${uid}/${eventId}/${kind}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from('event-media-branding')
        .upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const { data: pub } = supabase.storage.from('event-media-branding').getPublicUrl(path);
      const url = pub.publicUrl;
      if (kind === 'cover') setCoverUrl(url);
      else if (kind === 'logo') setLogoUrl(url);
      else { setBgImageUrl(url); setBgMode('image'); }
    } catch (e: any) {
      toast({ title: 'Upload failed', description: e?.message || 'Try again', variant: 'destructive' });
    } finally {
      setUploading(null);
      if (kind === 'cover' && coverInput.current) coverInput.current.value = '';
      if (kind === 'logo' && logoInput.current) logoInput.current.value = '';
      if (kind === 'background' && bgInput.current) bgInput.current.value = '';
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        // Accent colour is permanently Wedding Waitress gold — the column is kept
        // for backwards compatibility but is no longer customisable.
        theme_color: null,
        background_style: bg,
        cover_image_url: coverUrl,
        logo_image_url: logoUrl,
        show_branding: meta.show_branding !== false,
        background_mode: bgMode,
        background_color: bgMode === 'color' ? bgColor : null,
        background_image_url: bgMode === 'image' ? bgImageUrl : null,
      });
      toast({ title: 'Branding saved' });
    } catch (e: any) {
      toast({ title: 'Could not save', description: e?.message || 'Try again', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setBg('cream');
    setBgMode('preset');
    setHexDraft(DEFAULT_BG_COLOR);
    setHexError(null);
    setBgColor(DEFAULT_BG_COLOR);
    setBgImageUrl(null);
    setCoverUrl(null);
    setLogoUrl(null);
  };

  const previewStyle: React.CSSProperties =
    bgMode === 'color'
      ? { backgroundColor: bgColor }
      : bgMode === 'image' && bgImageUrl
        ? { backgroundImage: `url("${bgImageUrl}")`, backgroundSize: 'cover', backgroundPosition: 'center' }
        : { backgroundColor: BG_OPTIONS.find(o => o.value === bg)?.sample || '#F8F5F0' };

  return (
    <Card className="h-full p-4 sm:p-6 space-y-6 overflow-hidden">
      <div className="min-w-0">
        <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: '#000000' }}>
          <Palette className="h-5 w-5 text-[#967A59] shrink-0" strokeWidth={1.8} /> Branding &amp; Theme
        </h2>
        <p className="text-sm mt-1 break-words" style={{ color: '#1a1a1a' }}>
          Customise the look of your guest gallery. Buttons and accents always use the Wedding Waitress
          gold ({DEFAULT_THEME_COLOR}).
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 items-start">
        {/* LEFT — Event Branding */}
        <section className="space-y-5 min-w-0">
          <h3 className="text-sm font-bold uppercase tracking-wide text-[#967A59]">Event Branding</h3>

          <ImagePicker
            label="Cover Image / Logo (optional)"
            hint="Shown at the top of your guest-facing event page."
            url={coverUrl}
            uploading={uploading === 'cover'}
            inputRef={coverInput}
            onPick={(f) => uploadImage('cover', f)}
            onClear={() => setCoverUrl(null)}
          />

          <div className="hidden" aria-hidden="true">
            <ImagePicker
              label="Logo (optional)"
              hint="Displayed above your event title."
              url={logoUrl}
              uploading={uploading === 'logo'}
              inputRef={logoInput}
              onPick={(f) => uploadImage('logo', f)}
              onClear={() => setLogoUrl(null)}
              aspect="contain"
            />
          </div>
        </section>

        {/* RIGHT — Background Design (hidden, kept mounted) */}
        <section className="hidden space-y-5 min-w-0" aria-hidden="true">
          <h3 className="text-sm font-bold uppercase tracking-wide text-[#967A59]">Background Design</h3>

          {/* Custom colour */}
          <div>
            <div className="flex items-center justify-between gap-2">
              <Label className="text-sm">Choose a background colour</Label>
              {bgMode === 'color' && (
                <span className="text-[11px] font-semibold text-[#967A59] uppercase tracking-wide">Selected</span>
              )}
            </div>
            <div className="mt-1.5">
              <GalleryBackgroundColorPicker
                value={bgColor}
                active={bgMode === 'color'}
                onSelect={(hex) => { setBgColor(hex); setHexDraft(hex); setHexError(null); setBgMode('color'); }}
              />
            </div>

            <div className="mt-3">
              <Label className="text-sm" htmlFor="gallery-bg-hex">Hex colour code</Label>
              <Input
                id="gallery-bg-hex"
                value={hexDraft}
                onChange={(e) => {
                  const v = e.target.value;
                  setHexDraft(v);
                  const norm = normalizeHexColor(v);
                  if (norm) {
                    setHexError(null);
                    setBgColor(norm);
                    setBgMode('color');
                  } else {
                    setHexError('Enter a valid hex code, e.g. #F8F5F0');
                  }
                }}
                onBlur={() => {
                  const norm = normalizeHexColor(hexDraft);
                  if (norm) { setHexDraft(norm); setHexError(null); }
                  else { setHexDraft(bgColor); setHexError(null); }
                }}
                maxLength={7}
                placeholder="#F8F5F0"
                aria-invalid={!!hexError}
                aria-label="Hex colour code"
                className="mt-1.5 h-11 font-mono"
              />
              {hexError && <p className="text-xs text-destructive mt-1">{hexError}</p>}
            </div>

            <p className="text-xs text-muted-foreground mt-2">
              Changes the guest page background only — buttons and accents stay Wedding Waitress gold.
            </p>
          </div>

          {/* Background image tools */}
          <div>
            <Label className="text-sm">Background image</Label>
            <input
              ref={bgInput}
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={(e) => uploadImage('background', e.target.files?.[0] || null)}
            />
            <div className="mt-1.5 flex flex-col gap-2">
              <Button
                type="button"
                variant="outline"
                className="lv-premium-shade w-full h-11 justify-center"
                onClick={() => bgInput.current?.click()}
                disabled={uploading === 'background'}
              >
                {uploading === 'background'
                  ? <><LoaderCircle className="h-4 w-4 mr-1.5 animate-spin" strokeWidth={1.8} /> Uploading…</>
                  : <><Upload className="h-4 w-4 mr-1.5" strokeWidth={1.8} /> {bgImageUrl ? 'Replace Background Image' : 'Upload Background Image'}</>}
              </Button>

              <Button
                type="button"
                variant="outline"
                className="lv-premium-shade w-full h-11 justify-center"
                onClick={() => setGalleryOpen(true)}
              >
                <Images className="h-4 w-4 mr-1.5" strokeWidth={1.8} /> Browse Background Gallery
              </Button>

              <button
                type="button"
                onClick={() => window.open('https://www.canva.com/', '_blank', 'noopener,noreferrer')}
                className="lv-premium-shade h-11 px-4 rounded-md w-full flex items-center justify-center gap-2 text-white text-sm font-medium border-0 hover:opacity-90 transition-opacity"
                style={{ backgroundColor: '#7C3AED' }}
                aria-label="Design with Canva"
              >
                <img src={canvaLogo} alt="" className="h-5 w-5 rounded-full object-cover" />
                Design with Canva
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              Create or customise a design in Canva, download it as PNG or JPG, then return here and use
              Upload Background Image. JPG, PNG and WebP are supported (max 5 MB).
            </p>

            {bgImageUrl && (
              <div className="mt-3 rounded-md border border-border overflow-hidden">
                <img src={bgImageUrl} alt="Background preview" className="w-full h-32 object-cover" />
                <div className="flex gap-2 p-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="lv-premium-shade flex-1"
                    onClick={() => bgInput.current?.click()}
                    disabled={uploading === 'background'}
                  >
                    <Upload className="h-4 w-4 mr-1" strokeWidth={1.8} /> Replace Image
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="lv-premium-shade flex-1"
                    onClick={() => { setBgImageUrl(null); setBgMode('preset'); }}
                  >
                    <Trash2 className="h-4 w-4 mr-1" strokeWidth={1.8} /> Remove Image
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Live preview */}
          <div>
            <Label className="text-sm">Live preview</Label>
            <div
              className="mt-1.5 rounded-lg border border-border h-28 flex items-center justify-center"
              style={previewStyle}
            >
              <span
                className="rounded-full px-4 py-2 text-sm font-semibold text-white"
                style={{ backgroundColor: DEFAULT_THEME_COLOR }}
              >
                Share your photos
              </span>
            </div>
          </div>
        </section>
      </div>

      <div className="flex flex-wrap justify-between gap-2 pt-1">
        <Button variant="outline" className="lv-premium-shade h-11" onClick={handleReset} disabled={saving}>
          Reset to default
        </Button>
        <Button
          className="lv-premium-shade h-11 bg-green-600 hover:bg-green-700 text-white"
          variant="default"
          disabled={!dirty || saving || !!uploading}
          onClick={handleSave}
        >
          {saving ? <LoaderCircle className="h-4 w-4 mr-1 animate-spin" strokeWidth={1.8} /> : <Save className="h-4 w-4 mr-1" strokeWidth={1.8} />}
          Save branding
        </Button>
      </div>

      <GalleryBackgroundGalleryModal
        open={galleryOpen}
        onOpenChange={setGalleryOpen}
        currentUrl={bgImageUrl}
        onApply={(url) => { setBgImageUrl(url); setBgMode('image'); }}
      />
    </Card>
  );
};

interface ImagePickerProps {
  label: string;
  hint: string;
  url: string | null;
  uploading: boolean;
  inputRef: React.RefObject<HTMLInputElement>;
  onPick: (f: File | null) => void;
  onClear: () => void;
  aspect?: 'cover' | 'contain';
}

const ImagePicker: React.FC<ImagePickerProps> = ({ label, hint, url, uploading, inputRef, onPick, onClear, aspect = 'cover' }) => (
  <div>
    <Label className="text-sm">{label}</Label>
    <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>
    <input
      ref={inputRef}
      type="file"
      accept={ACCEPT}
      className="hidden"
      onChange={(e) => onPick(e.target.files?.[0] || null)}
    />
    <div className="mt-2 rounded-md border border-border bg-muted/40 overflow-hidden">
      {url ? (
        <div className="relative">
          <img
            src={url}
            alt=""
            className={`w-full h-32 ${aspect === 'cover' ? 'object-cover' : 'object-contain bg-white'}`}
          />
          <button
            type="button"
            onClick={onClear}
            className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1"
            aria-label="Remove image"
          >
            <X className="h-4 w-4" strokeWidth={1.8} />
          </button>
        </div>
      ) : (
        <div className="h-32 flex flex-col items-center justify-center text-muted-foreground">
          <ImagePlus className="h-6 w-6 mb-1" strokeWidth={1.8} />
          <span className="text-xs">No image</span>
        </div>
      )}
    </div>
    <div className="mt-2 flex gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="lv-premium-shade flex-1"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? <><LoaderCircle className="h-4 w-4 mr-1 animate-spin" strokeWidth={1.8} /> Uploading…</> : <><Upload className="h-4 w-4 mr-1" strokeWidth={1.8} /> {url ? 'Replace Image' : 'Choose Image'}</>}
      </Button>
      {url && (
        <Button type="button" variant="destructive" size="sm" className="lv-premium-shade flex-1" onClick={onClear}>
          <Trash2 className="h-4 w-4 mr-1" strokeWidth={1.8} /> Remove Image
        </Button>
      )}
    </div>
  </div>
);

export default GalleryBrandingCard;
