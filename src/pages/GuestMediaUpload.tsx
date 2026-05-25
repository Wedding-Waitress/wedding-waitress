// Public guest upload page — /gallery/:token
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useGuestMediaUpload } from '@/hooks/useGuestMediaUpload';
import { Camera, Upload, Loader2, CheckCircle2, AlertCircle, Heart } from 'lucide-react';
import { formatBytes } from '@/lib/mediaValidation';
import { SeoHead } from '@/components/SEO/SeoHead';

interface GalleryPublic {
  gallery_id: string;
  event_id: string;
  event_name: string;
  event_date: string;
  is_open: boolean;
  partner1_name: string | null;
  partner2_name: string | null;
  max_photos: number;
  max_videos: number;
  max_video_bytes: number;
  max_video_duration_sec: number;
  max_photo_bytes: number;
  allowed_photo_mimes: string[];
  allowed_video_mimes: string[];
}

export const GuestMediaUpload: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [gallery, setGallery] = useState<GalleryPublic | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState<File[]>([]);
  const [name, setName] = useState('');
  const [caption, setCaption] = useState('');
  const [guestbook, setGuestbook] = useState('');
  const [showThanks, setShowThanks] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const { uploadFiles, progress, uploading, reset } = useGuestMediaUpload();

  useEffect(() => {
    if (!token) return;
    (async () => {
      const { data } = await (supabase as any).rpc('get_event_media_gallery_public', { _token: token });
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) setNotFound(true);
      else setGallery(row as GalleryPublic);
      setLoading(false);
    })();
  }, [token]);

  const onFiles = useCallback((picked: FileList | null) => {
    if (!picked) return;
    setFiles(prev => [...prev, ...Array.from(picked)]);
  }, []);

  const onSubmit = async () => {
    if (!gallery || !token || files.length === 0) return;
    await uploadFiles(files, {
      token,
      uploaderName: name.trim(),
      caption: caption.trim(),
      guestbookMessage: guestbook.trim(),
      limits: gallery,
    });
  };

  // After all done, show thanks screen
  useEffect(() => {
    if (!uploading && progress.length > 0 && progress.every(p => p.status === 'done' || p.status === 'error')) {
      const anySuccess = progress.some(p => p.status === 'done');
      if (anySuccess) setShowThanks(true);
    }
  }, [uploading, progress]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-[#967A59]" /></div>;
  }
  if (notFound || !gallery) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-[#F8F5F0]">
        <Card className="p-8 max-w-md text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
          <h1 className="text-xl font-semibold mb-2">Gallery link not found</h1>
          <p className="text-sm text-muted-foreground">This upload link is invalid or has been closed by the host.</p>
        </Card>
      </div>
    );
  }
  if (!gallery.is_open) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-[#F8F5F0]">
        <Card className="p-8 max-w-md text-center">
          <Camera className="h-12 w-12 mx-auto mb-4 text-[#967A59]" />
          <h1 className="text-xl font-semibold mb-2">{gallery.event_name}</h1>
          <p className="text-sm text-muted-foreground">The host has closed uploads for this gallery.</p>
        </Card>
      </div>
    );
  }

  const couple = [gallery.partner1_name, gallery.partner2_name].filter(Boolean).join(' & ');

  if (showThanks) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-[#F8F5F0]">
        <Card className="p-8 max-w-md text-center">
          <Heart className="h-12 w-12 mx-auto mb-4 text-[#967A59]" fill="#967A59" />
          <h1 className="text-2xl font-semibold mb-2">Thank you!</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Your memories have been shared with {couple || 'the hosts'}.
          </p>
          <Button
            className="lv-premium-shade w-full"
            onClick={() => { setShowThanks(false); setFiles([]); setCaption(''); setGuestbook(''); reset(); }}
          >
            Share more photos & videos
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F5F0] px-4 py-6 pt-8 overflow-x-hidden">
      <SeoHead title={`${gallery.event_name} — Share your photos & videos`} description="Upload photos and short videos to the wedding gallery." />
      <div className="max-w-md mx-auto">
        <div className="text-center mb-6">
          <Camera className="h-10 w-10 mx-auto mb-3 text-[#967A59]" />
          <h1 className="text-2xl font-semibold text-[#1D1D1F]">{couple || gallery.event_name}</h1>
          <p className="text-sm text-[#6E6E73] mt-1">Share your favourite photos and short videos</p>
        </div>

        <Card className="p-5 space-y-5">
          <div>
            <Label htmlFor="g-name" className="text-base">Your first name</Label>
            <Input id="g-name" className="h-11 text-base mt-2" value={name} onChange={e => setName(e.target.value)} placeholder="So the couple knows who shared" />
          </div>

          <div>
            <Label className="text-base">Photos & videos</Label>
            <p className="text-xs text-muted-foreground mt-1 mb-2">
              Photos JPG/PNG/WebP up to {formatBytes(gallery.max_photo_bytes)} • Videos MP4/MOV up to {formatBytes(gallery.max_video_bytes)} and {gallery.max_video_duration_sec}s
            </p>
            <input
              ref={fileInput}
              type="file"
              multiple
              accept={[...gallery.allowed_photo_mimes, ...gallery.allowed_video_mimes].join(',')}
              className="hidden"
              onChange={e => onFiles(e.target.files)}
            />
            <Button type="button" variant="outline" className="lv-premium-shade w-full h-12" onClick={() => fileInput.current?.click()} disabled={uploading}>
              <Upload className="h-4 w-4 mr-2" /> Choose files
            </Button>
            {files.length > 0 && (
              <ul className="mt-3 space-y-2">
                {files.map((f, i) => {
                  const p = progress[i];
                  return (
                    <li key={i} className="text-sm border border-border rounded-lg p-2.5 bg-white">
                      <div className="flex justify-between items-center gap-2">
                        <span className="truncate flex-1">{f.name}</span>
                        <span className="text-xs text-muted-foreground">{formatBytes(f.size)}</span>
                      </div>
                      {p && p.status !== 'pending' && (
                        <div className="mt-1.5">
                          {p.status === 'error' ? (
                            <span className="text-xs text-red-600">{p.error}</span>
                          ) : p.status === 'done' ? (
                            <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Uploaded</span>
                          ) : (
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-[#967A59] transition-all" style={{ width: `${p.percent}%` }} />
                            </div>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div>
            <Label htmlFor="g-cap" className="text-base">Caption (optional)</Label>
            <Input id="g-cap" className="h-11 text-base mt-2" value={caption} onChange={e => setCaption(e.target.value)} placeholder="A short note about these memories" />
          </div>

          <div>
            <Label htmlFor="g-msg" className="text-base">Message to the couple (optional)</Label>
            <Textarea id="g-msg" className="mt-2 text-base" rows={3} value={guestbook} onChange={e => setGuestbook(e.target.value)} placeholder="Leave a guestbook message" />
          </div>

          <Button
            className="lv-premium-shade w-full h-12 bg-[#967A59] hover:bg-[#7d6448] text-white"
            disabled={uploading || files.length === 0 || !name.trim()}
            onClick={onSubmit}
          >
            {uploading ? (<><Loader2 className="animate-spin h-4 w-4 mr-2" /> Uploading…</>) : `Share ${files.length || ''} file${files.length === 1 ? '' : 's'}`}
          </Button>
        </Card>
      </div>
    </div>
  );
};

export default GuestMediaUpload;
