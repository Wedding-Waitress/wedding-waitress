import React, { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/enhanced-button';
import { Label } from '@/components/ui/label';
import { Palette, Save, Loader2, Upload, X, Image as ImageIcon, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { GalleryMeta, GalleryBrandingSettings } from '@/hooks/useEventMediaGallery';

interface Props {
  eventId: string;
  meta: GalleryMeta;
  onSave: (b: GalleryBrandingSettings) => Promise<void>;
}

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ACCEPT = 'image/jpeg,image/png,image/webp';

export const GalleryBrandingCard: React.FC<Props> = ({ eventId, meta, onSave }) => {
  const { toast } = useToast();
  const [coverUrl, setCoverUrl] = useState<string | null>(meta.cover_image_url || null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const coverInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCoverUrl(meta.cover_image_url || null);
  }, [meta.gallery_id, meta.cover_image_url]);

  const dirty = (coverUrl || null) !== (meta.cover_image_url || null);

  const uploadImage = async (file: File | null) => {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      toast({ title: 'Unsupported file type', description: 'Use JPG, PNG, or WebP', variant: 'destructive' });
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast({ title: 'Image too large', description: 'Max 5 MB', variant: 'destructive' });
      return;
    }
    setUploading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error('Not signed in');
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${uid}/${eventId}/cover-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from('event-media-branding')
        .upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const { data: pub } = supabase.storage.from('event-media-branding').getPublicUrl(path);
      setCoverUrl(pub.publicUrl);
    } catch (e: any) {
      toast({ title: 'Upload failed', description: e?.message || 'Try again', variant: 'destructive' });
    } finally {
      setUploading(false);
      if (coverInput.current) coverInput.current.value = '';
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        // Accent colour is permanently Wedding Waitress gold.
        theme_color: null,
        background_style: meta.background_style || 'cream',
        cover_image_url: coverUrl,
        logo_image_url: meta.logo_image_url || null,
        show_branding: meta.show_branding !== false,
        background_mode: meta.background_mode || 'preset',
        background_color: meta.background_color || null,
        background_image_url: meta.background_image_url || null,
      });
      toast({ title: 'Branding saved' });
    } catch (e: any) {
      toast({ title: 'Could not save', description: e?.message || 'Try again', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => setCoverUrl(null);

  return (
    <Card className="h-full p-4 sm:p-6 space-y-6 overflow-hidden">
      <div className="min-w-0">
        <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: '#000000' }}>
          <Palette className="h-5 w-5 text-[#967A59] shrink-0" /> Branding &amp; Theme
        </h2>
        <p className="text-sm mt-1 break-words" style={{ color: '#1a1a1a' }}>
          Add a cover image for your guest-facing event page. Without one, the default Wedding Waitress
          background is used.
        </p>
      </div>

      <section className="space-y-3 min-w-0 max-w-xl">
        <h3 className="text-sm font-bold uppercase tracking-wide text-[#967A59]">Event Branding</h3>

        <div>
          <Label className="text-sm">Cover image (optional)</Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Shown at the top of your guest-facing event page.
          </p>
          <input
            ref={coverInput}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={(e) => uploadImage(e.target.files?.[0] || null)}
          />
          <div className="mt-2 rounded-md border border-border bg-muted/40 overflow-hidden">
            {coverUrl ? (
              <div className="relative">
                <img src={coverUrl} alt="" className="w-full h-32 object-cover" />
                <button
                  type="button"
                  onClick={() => setCoverUrl(null)}
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
          <div className="mt-2 flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="lv-premium-shade flex-1"
              onClick={() => coverInput.current?.click()}
              disabled={uploading}
            >
              {uploading
                ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Uploading…</>
                : <><Upload className="h-4 w-4 mr-1" /> {coverUrl ? 'Replace Image' : 'Choose Image'}</>}
            </Button>
            {coverUrl && (
              <Button type="button" variant="destructive" size="sm" className="lv-premium-shade flex-1" onClick={() => setCoverUrl(null)}>
                <Trash2 className="h-4 w-4 mr-1" /> Remove Image
              </Button>
            )}
          </div>
        </div>
      </section>

      <div className="flex flex-wrap justify-between gap-2 pt-1">
        <Button variant="outline" className="lv-premium-shade h-11" onClick={handleReset} disabled={saving}>
          Reset to default
        </Button>
        <Button
          className="lv-premium-shade h-11"
          variant="default"
          disabled={!dirty || saving || uploading}
          onClick={handleSave}
        >
          {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
          Save branding
        </Button>
      </div>
    </Card>
  );
};

export default GalleryBrandingCard;
