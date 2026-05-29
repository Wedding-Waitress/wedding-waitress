// Public guest Photo Booth page — /gallery-photobooth/:token
// Supports two modes: 'single' (one photo) and 'strip' (3 photos composed into a wedding strip)
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Camera, Loader2, AlertCircle, RotateCcw, X, Save, Heart, RefreshCw } from 'lucide-react';
import { SeoHead } from '@/components/SEO/SeoHead';
import { GalleryPasswordGate, galleryPasswordKey } from '@/components/Dashboard/PhotoVideoGallery/GalleryPasswordGate';
import { resolveGalleryTheme } from '@/lib/galleryTheme';
import { usePhotoBoothUpload } from '@/hooks/usePhotoBoothUpload';

interface GalleryPublic {
  gallery_id: string;
  event_id: string;
  event_name: string;
  event_date: string;
  is_open: boolean;
  partner1_name: string | null;
  partner2_name: string | null;
  password_required: boolean;
  theme_color: string | null;
  background_style: 'light' | 'dark' | 'cream' | null;
  cover_image_url: string | null;
  logo_image_url: string | null;
  show_branding: boolean;
  photo_booth_enabled: boolean;
  photo_booth_mode: 'single' | 'strip' | null;
  gallery_title: string | null;
}

type Phase = 'preview' | 'captured' | 'saving' | 'saved';

const STRIP_COUNT = 3;

const formatEventDate = (iso: string | null) => {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
  } catch { return ''; }
};

// Compose a vertical photo strip from 3 image blobs.
// Returns a JPEG blob suitable for storage upload.
async function composeStrip(opts: {
  photos: Blob[];
  title: string;
  dateText: string;
  hashtag?: string;
  logoUrl?: string | null;
  showBranding: boolean;
}): Promise<Blob> {
  const W = 720;
  const padding = 40;
  const photoW = W - padding * 2; // 640
  const photoH = Math.round(photoW * 0.75); // 480 — 4:3
  const gap = 20;
  const footerH = 260;
  const H = padding + photoH * STRIP_COUNT + gap * (STRIP_COUNT - 1) + footerH + padding;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not available');

  // Cream/white wedding background
  ctx.fillStyle = '#FBF7F0';
  ctx.fillRect(0, 0, W, H);

  // Subtle outer frame
  ctx.strokeStyle = '#E8E1D6';
  ctx.lineWidth = 2;
  ctx.strokeRect(10, 10, W - 20, H - 20);

  // Draw each photo (centered crop, cover)
  const loadImage = (blob: Blob) => new Promise<HTMLImageElement>((res, rej) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => { URL.revokeObjectURL(url); res(img); };
    img.onerror = (e) => { URL.revokeObjectURL(url); rej(e); };
    img.src = url;
  });

  for (let i = 0; i < STRIP_COUNT; i++) {
    const img = await loadImage(opts.photos[i]);
    const x = padding;
    const y = padding + i * (photoH + gap);
    // Cover-fit crop
    const ir = img.width / img.height;
    const tr = photoW / photoH;
    let sx = 0, sy = 0, sw = img.width, sh = img.height;
    if (ir > tr) {
      sw = img.height * tr; sx = (img.width - sw) / 2;
    } else {
      sh = img.width / tr; sy = (img.height - sh) / 2;
    }
    // Thin photo border
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(x - 4, y - 4, photoW + 8, photoH + 8);
    ctx.drawImage(img, sx, sy, sw, sh, x, y, photoW, photoH);
    ctx.strokeStyle = '#D9CFBE';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, photoW, photoH);
  }

  // Footer
  const footerY = padding + photoH * STRIP_COUNT + gap * (STRIP_COUNT - 1) + 24;
  let cursorY = footerY;

  // Optional logo
  if (opts.logoUrl) {
    try {
      const logoImg = await new Promise<HTMLImageElement>((res, rej) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => res(img);
        img.onerror = (e) => rej(e);
        img.src = opts.logoUrl as string;
      });
      const maxLogoH = 70;
      const ratio = logoImg.width / logoImg.height;
      const lh = Math.min(maxLogoH, logoImg.height);
      const lw = lh * ratio;
      ctx.drawImage(logoImg, (W - lw) / 2, cursorY, lw, lh);
      cursorY += lh + 14;
    } catch {
      // ignore logo failure (CORS etc.)
    }
  }

  // Title (couple/event)
  ctx.fillStyle = '#1D1D1F';
  ctx.textAlign = 'center';
  ctx.font = '600 32px "Inter", system-ui, -apple-system, sans-serif';
  ctx.fillText(opts.title || '', W / 2, cursorY + 28);
  cursorY += 44;

  // Date
  if (opts.dateText) {
    ctx.fillStyle = '#6E6E73';
    ctx.font = '400 20px "Inter", system-ui, sans-serif';
    ctx.fillText(opts.dateText, W / 2, cursorY + 20);
    cursorY += 30;
  }

  // Optional hashtag
  if (opts.hashtag) {
    ctx.fillStyle = '#967A59';
    ctx.font = '500 18px "Inter", system-ui, sans-serif';
    ctx.fillText(opts.hashtag.startsWith('#') ? opts.hashtag : `#${opts.hashtag}`, W / 2, cursorY + 22);
    cursorY += 30;
  }

  // Branding line (optional)
  if (opts.showBranding) {
    ctx.fillStyle = '#A89D8A';
    ctx.font = '400 12px "Inter", system-ui, sans-serif';
    ctx.fillText('Wedding Waitress · Photo Booth', W / 2, H - padding - 4);
  }

  const blob: Blob | null = await new Promise(res => canvas.toBlob(b => res(b), 'image/jpeg', 0.92));
  if (!blob) throw new Error('Could not compose strip');
  return blob;
}

export const GuestPhotoBooth: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [gallery, setGallery] = useState<GalleryPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [name, setName] = useState('');
  const [phase, setPhase] = useState<Phase>('preview');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [streamReady, setStreamReady] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [stripPhotos, setStripPhotos] = useState<Blob[]>([]);
  const [stripActive, setStripActive] = useState(false);
  const [flash, setFlash] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const { upload, uploading } = usePhotoBoothUpload();

  const nameKey = token ? `gallery-uploader-name:${token}` : '';

  useEffect(() => {
    if (!token) return;
    try {
      if (sessionStorage.getItem(galleryPasswordKey(token))) setUnlocked(true);
      const saved = sessionStorage.getItem(nameKey);
      if (saved) setName(saved);
    } catch {}
  }, [token, nameKey]);

  useEffect(() => {
    if (!nameKey) return;
    try { if (name.trim()) sessionStorage.setItem(nameKey, name.trim()); } catch {}
  }, [name, nameKey]);

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

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setStreamReady(false);
  }, []);

  const startCamera = useCallback(async (fm: 'user' | 'environment') => {
    setErrorMsg(null);
    stopStream();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: fm }, width: { ideal: 1920 }, height: { ideal: 1440 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        await videoRef.current.play().catch(() => {});
      }
      setStreamReady(true);
    } catch (e: any) {
      setErrorMsg(e?.name === 'NotAllowedError' || /Permission/i.test(e?.message || '')
        ? 'Camera permission denied. Please allow camera access.'
        : (e?.message || 'Could not access your camera'));
    }
  }, [stopStream]);

  const mode: 'single' | 'strip' = gallery?.photo_booth_mode === 'strip' ? 'strip' : 'single';
  const ready = !!gallery && gallery.is_open && gallery.photo_booth_enabled && (!gallery.password_required || unlocked);

  useEffect(() => {
    if (ready && phase === 'preview') startCamera(facingMode);
    return () => { if (!ready) stopStream(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, phase, facingMode]);

  useEffect(() => () => { stopStream(); if (capturedUrl) URL.revokeObjectURL(capturedUrl); }, [stopStream, capturedUrl]);

  const flipCamera = () => {
    setFacingMode(f => (f === 'user' ? 'environment' : 'user'));
  };

  const grabFrameBlob = async (): Promise<Blob | null> => {
    if (!videoRef.current || !streamReady) return null;
    const v = videoRef.current;
    const w = v.videoWidth || 1280;
    const h = v.videoHeight || 720;
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    // Mirror selfies to match preview
    if (facingMode === 'user') {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(v, 0, 0, w, h);
    return await new Promise<Blob | null>(res => canvas.toBlob(b => res(b), 'image/jpeg', 0.9));
  };

  const captureSingle = async () => {
    const blob = await grabFrameBlob();
    if (!blob) { setErrorMsg('Could not capture photo'); return; }
    setCapturedBlob(blob);
    if (capturedUrl) URL.revokeObjectURL(capturedUrl);
    setCapturedUrl(URL.createObjectURL(blob));
    setPhase('captured');
    stopStream();
  };

  const captureStripFrame = async () => {
    const blob = await grabFrameBlob();
    if (!blob) { setErrorMsg('Could not capture photo'); setStripActive(false); return; }
    setFlash(true);
    setTimeout(() => setFlash(false), 180);
    const nextPhotos = [...stripPhotos, blob];
    setStripPhotos(nextPhotos);
    if (nextPhotos.length < STRIP_COUNT) {
      // Brief pause, then next countdown
      setTimeout(() => setCountdown(3), 700);
    } else {
      // All 3 captured — compose strip
      setStripActive(false);
      try {
        const couple = [gallery?.partner1_name, gallery?.partner2_name].filter(Boolean).join(' & ');
        const title = couple || gallery?.event_name || '';
        const dateText = formatEventDate(gallery?.event_date || null);
        const titleRaw = gallery?.gallery_title || '';
        const hashtag = titleRaw.startsWith('#') ? titleRaw : undefined;
        const stripBlob = await composeStrip({
          photos: nextPhotos,
          title,
          dateText,
          hashtag,
          logoUrl: gallery?.logo_image_url || null,
          showBranding: !!gallery?.show_branding,
        });
        setCapturedBlob(stripBlob);
        if (capturedUrl) URL.revokeObjectURL(capturedUrl);
        setCapturedUrl(URL.createObjectURL(stripBlob));
        setPhase('captured');
        stopStream();
      } catch (e: any) {
        setErrorMsg(e?.message || 'Could not compose strip');
        setStripPhotos([]);
      }
    }
  };

  const startCountdown = () => {
    if (!streamReady || countdown !== null) return;
    if (!name.trim()) { setErrorMsg('Please add your first name first.'); return; }
    setErrorMsg(null);
    if (mode === 'strip') {
      setStripPhotos([]);
      setStripActive(true);
    }
    setCountdown(3);
  };

  // Countdown ticker
  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      setCountdown(null);
      if (mode === 'strip') {
        captureStripFrame();
      } else {
        captureSingle();
      }
      return;
    }
    const t = setTimeout(() => setCountdown(c => (c === null ? null : c - 1)), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdown]);

  const retake = () => {
    if (capturedUrl) URL.revokeObjectURL(capturedUrl);
    setCapturedUrl(null);
    setCapturedBlob(null);
    setCountdown(null);
    setStripPhotos([]);
    setStripActive(false);
    setPhase('preview');
  };

  const cancel = () => {
    stopStream();
    if (capturedUrl) URL.revokeObjectURL(capturedUrl);
    setCapturedUrl(null);
    setCapturedBlob(null);
    setStripPhotos([]);
    setStripActive(false);
    setCountdown(null);
    setErrorMsg(null);
    if (window.history.length > 1) window.history.back();
    else window.close();
  };

  const save = async () => {
    if (!capturedBlob || !token) return;
    if (!name.trim()) { setErrorMsg('Please add your first name first.'); return; }
    setPhase('saving');
    setErrorMsg(null);
    const prefix = mode === 'strip' ? 'photobooth-strip' : 'photobooth';
    const filename = `${prefix}-${Date.now()}.jpg`;
    const ok = await upload(capturedBlob, {
      token,
      mime: 'image/jpeg',
      uploaderName: name.trim(),
      filename,
      isStrip: mode === 'strip',
    });
    if (ok) {
      setPhase('saved');
      if (capturedUrl) URL.revokeObjectURL(capturedUrl);
      setCapturedBlob(null);
      setCapturedUrl(null);
      setStripPhotos([]);
    } else {
      setPhase('captured');
      setErrorMsg('Could not upload your photo. Please try again.');
    }
  };

  const theme = resolveGalleryTheme(gallery);
  const accent = theme.themeColor;
  const accentSoftBg = `${accent}1A`;

  if (loading) {
    return <div className={`min-h-screen flex items-center justify-center ${theme.bgClass}`}><Loader2 className="animate-spin h-8 w-8" style={{ color: accent }} /></div>;
  }
  if (notFound || !gallery) {
    return (
      <div className={`min-h-screen flex items-center justify-center px-4 ${theme.bgClass}`}>
        <Card className={`p-8 max-w-md text-center ${theme.surfaceClass} ${theme.textClass}`}>
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
          <h1 className="text-xl font-semibold mb-2">Photo Booth link not found</h1>
          <p className={`text-sm ${theme.mutedClass}`}>This link is invalid or has been closed by the host.</p>
        </Card>
      </div>
    );
  }
  if (gallery.password_required && !unlocked && token) {
    return <GalleryPasswordGate token={token} title={`${gallery.event_name} — password required`} onVerified={() => setUnlocked(true)} theme={theme} />;
  }
  if (!gallery.is_open || !gallery.photo_booth_enabled) {
    return (
      <div className={`min-h-screen flex items-center justify-center px-4 ${theme.bgClass}`}>
        <Card className={`p-8 max-w-md text-center ${theme.surfaceClass} ${theme.textClass}`}>
          <Camera className="h-12 w-12 mx-auto mb-4" style={{ color: accent }} />
          <h1 className="text-xl font-semibold mb-2">{gallery.event_name}</h1>
          <p className={`text-sm ${theme.mutedClass}`}>
            {!gallery.is_open ? 'The host has closed this gallery.' : 'The Photo Booth is not enabled for this event.'}
          </p>
        </Card>
      </div>
    );
  }

  const couple = [gallery.partner1_name, gallery.partner2_name].filter(Boolean).join(' & ');
  const title = couple || gallery.event_name;
  const isCameraSupported = typeof window !== 'undefined' && !!navigator?.mediaDevices?.getUserMedia;
  const startLabel = mode === 'strip' ? 'Start Photo Strip' : 'Start Photo Booth';
  const stripProgress = stripPhotos.length; // 0..3
  const stripBusy = stripActive || (mode === 'strip' && countdown !== null);

  return (
    <div className={`min-h-screen px-4 py-6 pt-8 overflow-x-hidden ${theme.bgClass} ${theme.textClass}`}>
      <SeoHead title={`${gallery.event_name} — Photo Booth`} description="Snap a photo straight into the event gallery." />
      <div className="max-w-md mx-auto">
        <div className="text-center mb-6">
          {theme.logoImageUrl ? (
            <img src={theme.logoImageUrl} alt="" className="mx-auto max-h-16 mb-3 object-contain" />
          ) : (
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-3" style={{ backgroundColor: accentSoftBg }}>
              <Camera className="h-8 w-8" style={{ color: accent }} />
            </div>
          )}
          <h1 className="text-2xl font-semibold leading-tight">{mode === 'strip' ? 'Photo Strip Booth' : 'Photo Booth'}</h1>
          <p className={`text-sm mt-2 ${theme.mutedClass}`}>
            {mode === 'strip' ? `Three photos in a wedding strip for ${title}.` : `Take a photo for ${title}.`}
          </p>
        </div>

        {phase === 'saved' ? (
          <Card className={`p-7 text-center ${theme.surfaceClass} ${theme.textClass}`}>
            <div className="inline-flex w-16 h-16 rounded-full items-center justify-center mb-4" style={{ backgroundColor: accentSoftBg }}>
              <Heart className="h-8 w-8" style={{ color: accent }} fill={accent} />
            </div>
            <h2 className="text-xl font-semibold">Thanks{name.trim() ? `, ${name.trim().split(/\s+/)[0]}` : ''}!</h2>
            <p className={`text-sm mt-2 ${theme.mutedClass}`}>
              {mode === 'strip' ? 'Your photo strip has been added to the gallery.' : 'Your photo has been added to the gallery.'}
            </p>
            <div className="mt-6 space-y-2">
              <Button
                className="lv-premium-shade w-full h-11 text-white"
                style={{ backgroundColor: accent }}
                onClick={() => { setPhase('preview'); }}
              >
                {mode === 'strip' ? 'Make another strip' : 'Take another photo'}
              </Button>
            </div>
            {theme.showBranding && (
              <p className={`mt-4 text-[10px] uppercase tracking-wider ${theme.mutedClass}`}>Powered by Wedding Waitress</p>
            )}
          </Card>
        ) : (
          <Card className={`p-5 space-y-5 ${theme.surfaceClass} ${theme.textClass}`}>
            <div>
              <Label htmlFor="pb-name" className="text-base font-medium">Your first name <span className="text-red-500">*</span></Label>
              <Input id="pb-name" className="h-12 text-base mt-2" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Sarah" />
            </div>

            {!isCameraSupported && (
              <div className="rounded-md border border-amber-300 bg-amber-50 text-amber-900 text-sm p-3">
                Camera isn't supported in this browser. Try the latest Chrome, Safari, or Firefox.
              </div>
            )}

            {errorMsg && (
              <div className="rounded-md border border-red-300 bg-red-50 text-red-900 text-sm p-3 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /> <span>{errorMsg}</span>
              </div>
            )}

            {phase === 'captured' && capturedUrl ? (
              <div className="rounded-lg overflow-hidden bg-[#FBF7F0] flex items-center justify-center p-3">
                <img
                  src={capturedUrl}
                  alt={mode === 'strip' ? 'Photo strip preview' : 'Captured photo'}
                  className={mode === 'strip' ? 'max-h-[70vh] w-auto object-contain' : 'w-full h-auto object-cover'}
                />
              </div>
            ) : (
              <div className="rounded-lg overflow-hidden bg-black aspect-[3/4] relative">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  style={facingMode === 'user' ? { transform: 'scaleX(-1)' } : undefined}
                  playsInline muted autoPlay
                />
                {phase === 'preview' && !streamReady && isCameraSupported && countdown === null && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white text-sm">
                    <Loader2 className="animate-spin h-6 w-6 mr-2" /> Starting camera…
                  </div>
                )}
                {mode === 'strip' && stripBusy && (
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-black/55 text-white text-xs px-3 py-1 rounded-full">
                    Photo {Math.min(stripProgress + 1, STRIP_COUNT)} of {STRIP_COUNT}
                  </div>
                )}
                {countdown !== null && countdown > 0 && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none">
                    <span
                      key={countdown}
                      className="text-white font-bold drop-shadow-lg animate-scale-in"
                      style={{ fontSize: 'clamp(96px, 40vw, 200px)', lineHeight: 1 }}
                    >
                      {countdown}
                    </span>
                  </div>
                )}
                {flash && (
                  <div className="absolute inset-0 bg-white opacity-80 pointer-events-none transition-opacity" />
                )}
              </div>
            )}

            {/* Strip thumbnails progress (during capture) */}
            {mode === 'strip' && phase === 'preview' && stripProgress > 0 && stripProgress < STRIP_COUNT && (
              <div className="flex gap-2 justify-center">
                {Array.from({ length: STRIP_COUNT }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-12 h-16 rounded border ${i < stripProgress ? 'border-[#967A59] bg-[#967A59]/15' : 'border-border bg-muted/40'}`}
                  >
                    {i < stripProgress && (
                      <div className="w-full h-full flex items-center justify-center text-[#967A59] text-xs font-semibold">{i + 1}</div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {phase === 'preview' && (
              <div className="space-y-2.5">
                <Button
                  type="button"
                  className="lv-premium-shade w-full h-12 text-white text-base"
                  style={{ backgroundColor: accent }}
                  disabled={!isCameraSupported || !streamReady || countdown !== null || stripActive}
                  onClick={startCountdown}
                >
                  <Camera className="h-5 w-5 mr-2" />
                  {countdown !== null ? `Get ready… ${countdown || ''}` : startLabel}
                </Button>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="lv-premium-shade flex-1 h-11 text-base"
                    onClick={flipCamera}
                    disabled={!isCameraSupported || countdown !== null || stripActive}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" /> Flip
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="flex-1 h-11 text-base"
                    onClick={() => {
                      if (countdown !== null || stripActive) {
                        setCountdown(null);
                        setStripActive(false);
                        setStripPhotos([]);
                        return;
                      }
                      cancel();
                    }}
                  >
                    <X className="h-4 w-4 mr-2" /> {countdown !== null || stripActive ? 'Stop' : 'Cancel'}
                  </Button>
                </div>
              </div>
            )}

            {(phase === 'captured' || phase === 'saving') && (
              <div className="space-y-2.5">
                <Button
                  type="button"
                  className="lv-premium-shade w-full h-12 text-white text-base"
                  style={{ backgroundColor: accent }}
                  onClick={save}
                  disabled={uploading || phase === 'saving'}
                >
                  {uploading || phase === 'saving' ? (
                    <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Saving…</>
                  ) : (
                    <><Save className="h-5 w-5 mr-2" /> Save</>
                  )}
                </Button>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="lv-premium-shade flex-1 h-11 text-base"
                    onClick={retake}
                    disabled={phase === 'saving'}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" /> Retake
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="flex-1 h-11 text-base"
                    onClick={cancel}
                    disabled={phase === 'saving'}
                  >
                    <X className="h-4 w-4 mr-2" /> Cancel
                  </Button>
                </div>
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
};

export default GuestPhotoBooth;
