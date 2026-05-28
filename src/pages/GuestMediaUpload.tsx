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
import { Camera, Upload, Loader2, CheckCircle2, AlertCircle, AlertTriangle, X, Heart, Info, Image as ImageIcon, Video } from 'lucide-react';
import { formatBytes, validateFile, ValidationResult, ValidationStage } from '@/lib/mediaValidation';
import { SeoHead } from '@/components/SEO/SeoHead';
import { formatDisplayDate } from '@/lib/utils';

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
  gallery_title: string | null;
  welcome_message: string | null;
  show_event_date: boolean;
}

export const GuestMediaUpload: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [gallery, setGallery] = useState<GalleryPublic | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ValidationResult[]>([]);
  const [stages, setStages] = useState<Record<number, ValidationStage>>({});
  const [validating, setValidating] = useState(false);
  const [awaitingPicker, setAwaitingPicker] = useState(false);
  const [pickerHint, setPickerHint] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [caption, setCaption] = useState('');
  const [guestbook, setGuestbook] = useState('');
  const [showThanks, setShowThanks] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const pickerTimer = useRef<number | null>(null);
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

  const openPicker = useCallback(() => {
    setPickerHint(null);
    setAwaitingPicker(true);
    if (pickerTimer.current) window.clearTimeout(pickerTimer.current);
    // If no onChange fires within 30s after picker open, hint that iPhone may still be preparing.
    pickerTimer.current = window.setTimeout(() => {
      setPickerHint('Your iPhone may still be preparing the video. Please wait, or choose a smaller/local video.');
      setAwaitingPicker(false);
    }, 30000);
    fileInput.current?.click();
  }, []);

  const onFiles = useCallback(async (picked: FileList | null) => {
    if (pickerTimer.current) { window.clearTimeout(pickerTimer.current); pickerTimer.current = null; }
    setAwaitingPicker(false);
    if (!gallery) return;
    if (!picked || picked.length === 0) {
      setPickerHint('Your iPhone may still be preparing the video. Please wait, or choose a smaller/local video.');
      return;
    }
    setPickerHint(null);
    setValidating(true);
    const arr = Array.from(picked);
    const startIndex = items.length;
    // Insert placeholders immediately so the user sees activity.
    const placeholders: ValidationResult[] = arr.map(f => ({
      file: f, fileName: f.name, kind: null, mime: f.type || '',
      mimeInferred: !f.type, size: f.size, duration: null,
      durationUnknown: false, ok: true,
    }));
    setItems(prev => [...prev, ...placeholders]);
    setStages(prev => {
      const next = { ...prev };
      arr.forEach((_, i) => { next[startIndex + i] = 'preparing'; });
      return next;
    });

    for (let i = 0; i < arr.length; i++) {
      const idx = startIndex + i;
      let result: ValidationResult;
      try {
        result = await validateFile(arr[i], gallery, (s) => {
          setStages(prev => ({ ...prev, [idx]: s }));
        });
      } catch {
        result = {
          file: arr[i], fileName: arr[i].name, kind: null, mime: arr[i].type || '',
          mimeInferred: !arr[i].type, size: arr[i].size, duration: null,
          durationUnknown: false, ok: false,
          reason: 'file_unreadable', reasonText: 'File could not be loaded from device/iCloud',
        };
      }
      setItems(prev => prev.map((it, j) => j === idx ? result : it));
      setStages(prev => ({ ...prev, [idx]: 'ready' }));
    }
    setValidating(false);
    if (fileInput.current) fileInput.current.value = '';
  }, [gallery, items.length]);

  const removeItem = (i: number) => {
    setItems(prev => prev.filter((_, idx) => idx !== i));
    setStages(prev => { const n = { ...prev }; delete n[i]; return n; });
  };

  const onSubmit = async () => {
    if (!gallery || !token || items.length === 0) return;
    await uploadFiles(items, {
      token,
      uploaderName: name.trim(),
      caption: caption.trim(),
      guestbookMessage: guestbook.trim(),
      limits: gallery,
    });
  };

  useEffect(() => {
    if (!uploading && progress.length > 0 && progress.every(p => p.status === 'done' || p.status === 'error' || p.status === 'skipped')) {
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
  const displayTitle = gallery.gallery_title?.trim() || couple || gallery.event_name;
  const displayWelcome = gallery.welcome_message?.trim() || 'Share your favourite photos and videos from today.';
  const showDate = gallery.show_event_date !== false && !!gallery.event_date;

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
            onClick={() => { setShowThanks(false); setItems([]); setCaption(''); setGuestbook(''); reset(); }}
          >
            Share more photos & videos
          </Button>
        </Card>
      </div>
    );
  }

  const validCount = items.filter(i => i.ok).length;

  return (
    <div className="min-h-screen bg-[#F8F5F0] px-4 py-6 pt-8 overflow-x-hidden">
      <SeoHead title={`${gallery.event_name} — Share your photos & videos`} description="Upload photos and short videos to the wedding gallery." />
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#967A59]/10 mb-4">
            <Camera className="h-8 w-8 text-[#967A59]" />
          </div>
          <h1 className="text-3xl font-semibold text-[#1D1D1F] leading-tight">
            {couple || gallery.event_name}
          </h1>
          {gallery.event_date && (
            <p className="text-sm text-[#6E6E73] mt-2">
              {formatDisplayDate(gallery.event_date)}
            </p>
          )}
          <p className="text-base text-[#6E6E73] mt-3 max-w-xs mx-auto leading-relaxed">
            Share your favourite photos and videos from today.
          </p>
        </div>

        <Card className="p-5 space-y-5">
          <div>
            <Label htmlFor="g-name" className="text-base font-medium">
              Your first name <span className="text-red-500" aria-hidden="true">*</span>
            </Label>
            <p className="text-xs text-[#6E6E73] mt-1">So the couple knows who shared these memories</p>
            <Input id="g-name" className="h-12 text-base mt-2" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Sarah" />
          </div>

          <div>
            <Label className="text-base font-medium">Photos & videos</Label>

            <div className="mt-2 mb-3 bg-white/70 rounded-xl p-3.5 border border-[#E8E1D6] space-y-2">
              <p className="text-xs font-medium text-[#1D1D1F]">Upload limits</p>
              <div className="flex items-start gap-2 text-xs text-[#6E6E73]">
                <ImageIcon className="h-4 w-4 text-[#967A59] mt-0.5 shrink-0" />
                <span>Photos: JPG, PNG, WebP up to {formatBytes(gallery.max_photo_bytes)}</span>
              </div>
              <div className="flex items-start gap-2 text-xs text-[#6E6E73]">
                <Video className="h-4 w-4 text-[#967A59] mt-0.5 shrink-0" />
                <span>Videos: MP4, MOV up to {formatBytes(gallery.max_video_bytes)} and {Math.floor(gallery.max_video_duration_sec / 60)} minutes</span>
              </div>
            </div>
            <input
              ref={fileInput}
              type="file"
              multiple
              accept={[...gallery.allowed_photo_mimes, ...gallery.allowed_video_mimes, '.mov', '.mp4', '.m4v'].join(',')}
              className="hidden"
              onChange={e => onFiles(e.target.files)}
            />
            <Button type="button" variant="outline" className="lv-premium-shade w-full h-12" onClick={openPicker} disabled={uploading || validating || awaitingPicker}>
              {awaitingPicker
                ? <><Loader2 className="animate-spin h-4 w-4 mr-2" /> Waiting for picker…</>
                : validating
                  ? <><Loader2 className="animate-spin h-4 w-4 mr-2" /> Preparing selected files…</>
                  : <><Upload className="h-4 w-4 mr-2" /> Choose files</>}
            </Button>

            {(awaitingPicker || validating) && (
              <div className="mt-2 text-xs text-[#6E6E73] flex items-center gap-1.5">
                <Loader2 className="animate-spin h-3 w-3" />
                {awaitingPicker ? 'Waiting for your selection…' : 'Preparing selected files…'}
              </div>
            )}

            {pickerHint && (
              <div className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2 flex items-start gap-1.5">
                <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                <span>{pickerHint}</span>
              </div>
            )}

            {items.length > 0 && (
              <ul className="mt-3 space-y-2">
                {items.map((it, i) => {
                  const p = progress[i];
                  const status = p?.status;
                  const stage = stages[i];
                  const errMsg = p?.error || it.reasonText;
                  const isVideo = it.kind === 'video' || /\.(mov|mp4|m4v|qt)$/i.test(it.fileName);
                  const stillValidating = stage && stage !== 'ready';
                  const durationText =
                    it.kind === 'video'
                      ? (it.durationUnknown ? 'duration unknown' : `${it.duration ?? '?'}s`)
                      : null;
                  return (
                    <li key={i} className="text-sm border border-border rounded-lg p-2.5 bg-white">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{it.fileName}</div>
                          <div className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                            {it.mime || 'unknown type'}{it.mimeInferred && it.mime ? ' (inferred)' : ''} • {formatBytes(it.size)}
                            {durationText ? ` • ${durationText}` : ''}
                          </div>
                        </div>
                        {!uploading && status !== 'done' && !stillValidating && (
                          <button
                            type="button"
                            aria-label="Remove"
                            onClick={() => removeItem(i)}
                            className="text-muted-foreground hover:text-foreground p-1 -m-1"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>

                      {/* Validation / progress badge */}
                      <div className="mt-1.5">
                        {stillValidating ? (
                          <span className="text-xs text-[#967A59] flex items-center gap-1">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            {isVideo
                              ? (stage === 'preparing' ? 'Preparing file…' : 'Checking video…')
                              : 'Preparing file…'}
                          </span>
                        ) : !it.ok ? (
                          <span className="text-xs text-red-600 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" /> {it.reasonText}
                          </span>
                        ) : status === 'error' ? (
                          <span className="text-xs text-red-600 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" /> {errMsg}
                          </span>
                        ) : status === 'done' ? (
                          <span className="text-xs text-green-600 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Uploaded
                          </span>
                        ) : status === 'uploading' ? (
                          <div>
                            <div className="text-[11px] text-[#6E6E73] mb-1">Uploading {p?.percent ?? 0}%</div>
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-[#967A59] transition-all" style={{ width: `${p?.percent ?? 0}%` }} />
                            </div>
                          </div>
                        ) : it.durationUnknown ? (
                          <span className="text-xs text-amber-600 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" /> Duration unknown — will still upload
                          </span>
                        ) : (
                          <span className="text-xs text-green-600 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Ready to upload
                          </span>
                        )}
                      </div>
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

          <div>
            <Button
              className="lv-premium-shade w-full h-12 bg-[#967A59] hover:bg-[#7d6448] text-white"
              disabled={uploading || validating || validCount === 0 || !name.trim()}
              onClick={onSubmit}
            >
              {uploading
                ? (<><Loader2 className="animate-spin h-4 w-4 mr-2" /> Uploading…</>)
                : `Share ${validCount || ''} file${validCount === 1 ? '' : 's'}`}
            </Button>

            {!uploading && !validating && (
              <div className="mt-2 text-xs text-center text-[#6E6E73] min-h-[1.25rem]">
                {!name.trim() && items.length > 0
                  ? 'Enter your first name above to share these memories'
                  : name.trim() && validCount === 0 && items.length > 0
                    ? 'Remove invalid files or choose new ones to share'
                    : name.trim() && items.length === 0
                      ? 'Choose at least one photo or video to share'
                      : ''}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default GuestMediaUpload;
