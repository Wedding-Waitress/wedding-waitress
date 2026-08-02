import React, { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/enhanced-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Palette, Save, Loader2, Upload, X, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { GalleryMeta, GalleryBrandingSettings } from '@/hooks/useEventMediaGallery';
import { DEFAULT_THEME_COLOR } from '@/lib/galleryTheme';

interface Props {
  eventId: string;
  meta: GalleryMeta;
  onSave: (b: GalleryBrandingSettings) => Promise<void>;
}

const BG_OPTIONS: { value: 'light' | 'dark' | 'cream'; label: string; swatch: string; sample: string }[] = [
  { value: 'cream', label: 'Soft cream', swatch: '#F8F5F0', sample: '#F8F5F0' },
  { value: 'light', label: 'Light', swatch: '#FFFFFF', sample: '#FFFFFF' },
  { value: 'dark',  label: 'Dark',  swatch: '#0B0B0B', sample: '#0B0B0B' },
];

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ACCEPT = 'image/jpeg,image/png,image/webp';

export const GalleryBrandingCard: React.FC<Props> = ({ eventId, meta, onSave }) => {
  const { toast } = useToast();
  const [themeColor, setThemeColor] = useState<string>(meta.theme_color || DEFAULT_THEME_COLOR);
  const [bg, setBg] = useState<'light' | 'dark' | 'cream'>(meta.background_style || 'cream');
  const [coverUrl, setCoverUrl] = useState<string | null>(meta.cover_image_url || null);
  const [logoUrl, setLogoUrl] = useState<string | null>(meta.logo_image_url || null);
  const [showBranding, setShowBranding] = useState<boolean>(meta.show_branding !== false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<'cover' | 'logo' | null>(null);
  const coverInput = useRef<HTMLInputElement>(null);
  const logoInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setThemeColor(meta.theme_color || DEFAULT_THEME_COLOR);
    setBg(meta.background_style || 'cream');
    setCoverUrl(meta.cover_image_url || null);
    setLogoUrl(meta.logo_image_url || null);
    setShowBranding(meta.show_branding !== false);
  }, [meta.gallery_id, meta.theme_color, meta.background_style, meta.cover_image_url, meta.logo_image_url, meta.show_branding]);

  const dirty =
    themeColor !== (meta.theme_color || DEFAULT_THEME_COLOR) ||
    bg !== (meta.background_style || 'cream') ||
    (coverUrl || null) !== (meta.cover_image_url || null) ||
    (logoUrl || null) !== (meta.logo_image_url || null) ||
    showBranding !== (meta.show_branding !== false);

  const handlePick = async (kind: 'cover' | 'logo', file: File | null) => {
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
      if (kind === 'cover') setCoverUrl(url); else setLogoUrl(url);
    } catch (e: any) {
      toast({ title: 'Upload failed', description: e?.message || 'Try again', variant: 'destructive' });
    } finally {
      setUploading(null);
      if (kind === 'cover' && coverInput.current) coverInput.current.value = '';
      if (kind === 'logo' && logoInput.current) logoInput.current.value = '';
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        theme_color: themeColor === DEFAULT_THEME_COLOR ? null : themeColor,
        background_style: bg,
        cover_image_url: coverUrl,
        logo_image_url: logoUrl,
        show_branding: showBranding,
      });
      toast({ title: 'Branding saved' });
    } catch (e: any) {
      toast({ title: 'Could not save', description: e?.message || 'Try again', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setThemeColor(DEFAULT_THEME_COLOR);
    setBg('cream');
    setCoverUrl(null);
    setLogoUrl(null);
    setShowBranding(true);
  };

  return (
    <Card className="p-5 space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-[#1D1D1F] flex items-center gap-2">
          <Palette className="h-5 w-5 text-[#967A59]" /> Branding &amp; Theme
        </h2>
        <p className="text-sm text-muted-foreground">
          Customise the look of your guest gallery.
        </p>
      </div>

      {/* Theme colour */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <Label className="text-sm">Theme colour</Label>
          <div className="mt-1.5 flex items-center gap-2">
            <input
              type="color"
              value={themeColor}
              onChange={(e) => setThemeColor(e.target.value)}
              className="h-11 w-14 rounded-md border border-border cursor-pointer bg-transparent p-1"
              aria-label="Theme colour"
            />
            <Input
              value={themeColor}
              onChange={(e) => {
                const v = e.target.value.trim();
                if (/^#?[0-9a-fA-F]{0,6}$/.test(v)) setThemeColor(v.startsWith('#') ? v : `#${v}`);
              }}
              maxLength={7}
              className="h-11 font-mono"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">Used for buttons and accents. Defaults to {DEFAULT_THEME_COLOR}.</p>
        </div>

        <div>
          <Label className="text-sm">Background style</Label>
          <div className="mt-1.5 grid grid-cols-3 gap-2">
            {BG_OPTIONS.map(opt => {
              const active = bg === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setBg(opt.value)}
                  className={`rounded-md border p-2 flex flex-col items-center gap-1.5 transition-colors ${
                    active ? 'border-[#967A59] ring-2 ring-[#967A59]/20' : 'border-border hover:border-[#967A59]/50'
                  }`}
                >
                  <div
                    className="w-full h-10 rounded border border-black/5"
                    style={{ background: opt.sample }}
                  />
                  <span className="text-xs font-medium">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Cover + Logo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <ImagePicker
          label="Cover image (optional)"
          hint="Shown at the top of the guest upload page. Recommended 1600×600."
          url={coverUrl}
          uploading={uploading === 'cover'}
          inputRef={coverInput}
          onPick={(f) => handlePick('cover', f)}
          onClear={() => setCoverUrl(null)}
        />
        <ImagePicker
          label="Logo (optional)"
          hint="Small logo shown above the gallery title."
          url={logoUrl}
          uploading={uploading === 'logo'}
          inputRef={logoInput}
          onPick={(f) => handlePick('logo', f)}
          onClear={() => setLogoUrl(null)}
          aspect="contain"
        />
      </div>




      <div className="flex justify-between gap-2">
        <Button variant="outline" className="lv-premium-shade" onClick={handleReset} disabled={saving}>
          Reset to default
        </Button>
        <Button
          className="lv-premium-shade"
          variant="default"
          disabled={!dirty || saving || !!uploading}
          onClick={handleSave}
        >
          {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
          Save branding
        </Button>
      </div>
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
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="lv-premium-shade mt-2 w-full"
      onClick={() => inputRef.current?.click()}
      disabled={uploading}
    >
      {uploading ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Uploading…</> : <><Upload className="h-4 w-4 mr-1" /> {url ? 'Replace image' : 'Choose image'}</>}
    </Button>
  </div>
);

export default GalleryBrandingCard;
