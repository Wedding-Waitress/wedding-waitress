// Digital Photo Booth template settings — bottom text, optional logo, optional template artwork
// for both Single Photo and Photo Strip modes.
import React, { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/enhanced-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Image as ImageIcon, Upload, X, Save, Loader2, LayoutGrid, FileImage, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { GalleryMeta, PhotoBoothTemplateSettings } from '@/hooks/useEventMediaGallery';
import { PhotoBoothTemplatePreview } from './PhotoBoothTemplatePreview';
import { defaultBottomText, formatEventDate, type ComposeOpts } from '@/lib/photoBoothTemplate';

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const LOGO_ACCEPT = 'image/jpeg,image/png,image/webp';
const TEMPLATE_ACCEPT = 'image/jpeg';

interface Props {
  eventId: string;
  meta: GalleryMeta;
  eventName?: string | null;
  eventDate?: string | null;
  onSave: (kind: 'single' | 'strip', s: PhotoBoothTemplateSettings) => Promise<void>;
}

export const GalleryPhotoBoothTemplatesCard: React.FC<Props> = ({ eventId, meta, eventName, eventDate, onSave }) => {
  const dateText = formatEventDate(eventDate || null);
  const title = (eventName || '').trim();
  const fallbackText = defaultBottomText(title, dateText);
  const hashtag = meta.gallery_title?.startsWith('#') ? meta.gallery_title : undefined;

  return (
    <Card className="p-5 space-y-5">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: '#000000' }}>
          <FileImage className="h-5 w-5 text-[#967A59] shrink-0" /> Digital Photo Booth Templates
        </h2>
        <p className="text-sm mt-1 break-words" style={{ color: '#1a1a1a' }}>
          Customise the photo strip — borders around the photos and the footer with your event name and date.
        </p>
      </div>

      <TemplateEditor
        kind="strip"
        title="Photo Strip template"
        description="Used in Photo Strip mode. Final output is two identical vertical strips side-by-side on one landscape canvas, like a real photo booth print."
        recommended={[
          { label: 'Side-by-side strip canvas', size: '1440 × 2000 px (JPEG)' },
        ]}
        eventId={eventId}
        eventTitle={title}
        dateText={dateText}
        hashtag={hashtag}
        showBranding={meta.show_branding}
        fallbackText={fallbackText}
        bottomText={meta.photo_booth_strip_bottom_text}
        logoUrl={meta.photo_booth_strip_logo_url}
        templateUrl={meta.photo_booth_strip_template_url}
        onSave={(s) => onSave('strip', s)}
      />
    </Card>
  );
};

interface EditorProps {
  kind: 'single' | 'strip';
  title: string;
  description: string;
  recommended: { label: string; size: string }[];
  eventId: string;
  eventTitle: string;
  dateText: string;
  hashtag?: string;
  showBranding: boolean;
  fallbackText: string;
  bottomText: string | null;
  logoUrl: string | null;
  templateUrl: string | null;
  onSave: (s: PhotoBoothTemplateSettings) => Promise<void>;
}

const TemplateEditor: React.FC<EditorProps> = ({ kind, title, description, recommended, eventId, eventTitle, dateText, hashtag, showBranding, fallbackText, bottomText, logoUrl, templateUrl, onSave }) => {
  const { toast } = useToast();
  const [text, setText] = useState(bottomText || '');
  const [logo, setLogo] = useState<string | null>(logoUrl);
  const [tpl, setTpl] = useState<string | null>(templateUrl);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<'logo' | 'template' | null>(null);
  const logoInput = useRef<HTMLInputElement>(null);
  const tplInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setText(bottomText || '');
    setLogo(logoUrl);
    setTpl(templateUrl);
  }, [bottomText, logoUrl, templateUrl]);

  const dirty = (text || '') !== (bottomText || '') || (logo || null) !== (logoUrl || null) || (tpl || null) !== (templateUrl || null);

  const upload = async (which: 'logo' | 'template', file: File | null) => {
    if (!file) return;
    const allowed = which === 'template' ? TEMPLATE_ACCEPT.split(',') : LOGO_ACCEPT.split(',');
    if (!allowed.includes(file.type)) {
      toast({
        title: 'Unsupported file type',
        description: which === 'template' ? 'Template artwork must be a JPEG (.jpg).' : 'Use JPG, PNG, or WebP.',
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
      const path = `${uid}/${eventId}/photobooth-${kind}-${which}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('event-media-branding').upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const { data: pub } = supabase.storage.from('event-media-branding').getPublicUrl(path);
      if (which === 'logo') setLogo(pub.publicUrl); else setTpl(pub.publicUrl);
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
      await onSave({
        bottom_text: text.trim() || null,
        logo_url: logo || null,
        template_url: tpl || null,
      });
      toast({ title: `${title} saved` });
    } catch (e: any) {
      toast({ title: 'Could not save', description: e?.message || 'Try again', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setText(fallbackText);
    setLogo(null);
    setTpl(null);
  };

  const previewOpts: ComposeOpts = {
    title: eventTitle,
    dateText,
    hashtag,
    bottomText: text.trim() || null,
    logoUrl: logo,
    templateUrl: tpl,
    showBranding,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        {kind === 'strip' ? <LayoutGrid className="h-5 w-5 text-[#967A59] mt-0.5 shrink-0" /> : <ImageIcon className="h-5 w-5 text-[#967A59] mt-0.5 shrink-0" />}
        <div>
          <h3 className="text-base font-semibold text-[#1D1D1F]">{title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
      </div>

      <div>
        <Label className="text-sm">Custom bottom text</Label>
        <Input
          className="h-11 mt-1.5"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={fallbackText}
          maxLength={120}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Shown on the bottom branding strip. Leave empty to use the default: <span className="font-medium text-[#1D1D1F]">{fallbackText}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ImageSlot
          label="Optional logo / image"
          hint="PNG with transparent background works best."
          accept={LOGO_ACCEPT}
          url={logo}
          uploading={uploading === 'logo'}
          inputRef={logoInput}
          onPick={(f) => upload('logo', f)}
          onClear={() => setLogo(null)}
          aspect="contain"
        />
        <ImageSlot
          label="Optional template artwork (JPEG)"
          hint="Becomes the full background of the final photo. Photos are placed on top."
          accept={TEMPLATE_ACCEPT}
          url={tpl}
          uploading={uploading === 'template'}
          inputRef={tplInput}
          onPick={(f) => upload('template', f)}
          onClear={() => setTpl(null)}
          aspect="cover"
        />
      </div>

      <div>
        <Label className="text-sm">Live preview</Label>
        <p className="text-xs text-muted-foreground mt-0.5">
          {tpl ? 'Using your uploaded template artwork.' : 'Using the built-in default template — no upload needed.'}
        </p>
        <div className="mt-2">
          <PhotoBoothTemplatePreview kind={kind} opts={previewOpts} />
        </div>
      </div>

      <div className="rounded-md border border-border bg-muted/40 p-3 text-xs text-[#1D1D1F]">
        <p className="font-semibold mb-1">Recommended template dimensions</p>
        <ul className="space-y-0.5 text-[#6E6E73]">
          {recommended.map(r => (
            <li key={r.label}>• <span className="font-medium text-[#1D1D1F]">{r.label}:</span> {r.size}</li>
          ))}
        </ul>
      </div>

      <div className="flex justify-between gap-2 flex-wrap">
        <Button variant="outline" className="lv-premium-shade" onClick={handleReset} disabled={saving || !!uploading}>
          <RotateCcw className="h-4 w-4 mr-1" /> Reset to default
        </Button>
        <Button className="lv-premium-shade" disabled={!dirty || saving || !!uploading} onClick={handleSave}>
          {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
          Save template
        </Button>
      </div>
    </div>
  );
};

interface ImageSlotProps {
  label: string;
  hint: string;
  accept: string;
  url: string | null;
  uploading: boolean;
  inputRef: React.RefObject<HTMLInputElement>;
  onPick: (f: File | null) => void;
  onClear: () => void;
  aspect: 'cover' | 'contain';
}

const ImageSlot: React.FC<ImageSlotProps> = ({ label, hint, accept, url, uploading, inputRef, onPick, onClear, aspect }) => (
  <div>
    <Label className="text-sm">{label}</Label>
    <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>
    <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={(e) => onPick(e.target.files?.[0] || null)} />
    <div className="mt-2 rounded-md border border-border bg-muted/40 overflow-hidden">
      {url ? (
        <div className="relative">
          <img src={url} alt="" className={`w-full h-32 ${aspect === 'cover' ? 'object-cover' : 'object-contain bg-white'}`} />
          <button
            type="button"
            onClick={onClear}
            className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1"
            aria-label="Remove"
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
    <Button type="button" variant="outline" size="sm" className="lv-premium-shade mt-2 w-full" onClick={() => inputRef.current?.click()} disabled={uploading}>
      {uploading ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Uploading…</> : <><Upload className="h-4 w-4 mr-1" /> {url ? 'Replace' : 'Choose file'}</>}
    </Button>
  </div>
);

export default GalleryPhotoBoothTemplatesCard;
