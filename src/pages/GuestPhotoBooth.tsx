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
  photo_booth_single_bottom_text: string | null;
  photo_booth_single_logo_url: string | null;
  photo_booth_single_template_url: string | null;
  photo_booth_strip_bottom_text: string | null;
  photo_booth_strip_logo_url: string | null;
  photo_booth_strip_template_url: string | null;
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

const loadImageEl = (src: string, crossOrigin = true) => new Promise<HTMLImageElement>((res, rej) => {
  const img = new Image();
  if (crossOrigin) img.crossOrigin = 'anonymous';
  img.onload = () => res(img);
  img.onerror = (e) => rej(e);
  img.src = src;
});

const drawCover = (ctx: CanvasRenderingContext2D, img: HTMLImageElement | HTMLCanvasElement, dx: number, dy: number, dw: number, dh: number) => {
  const iw = (img as any).naturalWidth || (img as any).width;
  const ih = (img as any).naturalHeight || (img as any).height;
  const ir = iw / ih;
  const tr = dw / dh;
  let sx = 0, sy = 0, sw = iw, sh = ih;
  if (ir > tr) { sw = ih * tr; sx = (iw - sw) / 2; }
  else { sh = iw / tr; sy = (ih - sh) / 2; }
  ctx.drawImage(img as any, sx, sy, sw, sh, dx, dy, dw, dh);
};

const wrapText = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) => {
  const words = text.split(/\s+/);
  let line = '';
  const lines: string[] = [];
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line); line = w;
    } else { line = test; }
  }
  if (line) lines.push(line);
  lines.forEach((ln, i) => ctx.fillText(ln, x, y + i * lineHeight));
  return lines.length * lineHeight;
};

// Shared footer renderer: draws optional logo (if provided), bottom text, branding line.
async function drawFooter(ctx: CanvasRenderingContext2D, opts: {
  x: number; y: number; width: number; height: number;
  bottomText: string | null;
  logoUrl: string | null;
  fallbackTitle: string;
  dateText: string;
  hashtag?: string;
  showBranding: boolean;
  hasTemplate: boolean;
  scale: number;
}) {
  const { x, y, width, height, bottomText, logoUrl, fallbackTitle, dateText, hashtag, showBranding, hasTemplate, scale } = opts;

  // Soft cream backdrop only when no template
  if (!hasTemplate) {
    ctx.fillStyle = '#FBF7F0';
    ctx.fillRect(x, y, width, height);
  }

  let cursorY = y + 24 * scale;
  const cx = x + width / 2;

  // Optional logo
  if (logoUrl) {
    try {
      const logoImg = await loadImageEl(logoUrl);
      const maxLogoH = 80 * scale;
      const ratio = logoImg.width / logoImg.height;
      const lh = Math.min(maxLogoH, logoImg.height * scale);
      const lw = lh * ratio;
      ctx.drawImage(logoImg, cx - lw / 2, cursorY, lw, lh);
      cursorY += lh + 12 * scale;
    } catch {/* ignore */}
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  if (bottomText) {
    ctx.fillStyle = '#1D1D1F';
    ctx.font = `600 ${Math.round(30 * scale)}px "Inter", system-ui, sans-serif`;
    const used = wrapText(ctx, bottomText, cx, cursorY, width - 40 * scale, Math.round(36 * scale));
    cursorY += used + 6 * scale;
  } else {
    // Default branding: title + date + optional hashtag
    ctx.fillStyle = '#1D1D1F';
    ctx.font = `600 ${Math.round(30 * scale)}px "Inter", system-ui, sans-serif`;
    ctx.fillText(fallbackTitle || '', cx, cursorY);
    cursorY += 38 * scale;
    if (dateText) {
      ctx.fillStyle = '#6E6E73';
      ctx.font = `400 ${Math.round(20 * scale)}px "Inter", system-ui, sans-serif`;
      ctx.fillText(dateText, cx, cursorY);
      cursorY += 28 * scale;
    }
    if (hashtag) {
      ctx.fillStyle = '#967A59';
      ctx.font = `500 ${Math.round(18 * scale)}px "Inter", system-ui, sans-serif`;
      ctx.fillText(hashtag.startsWith('#') ? hashtag : `#${hashtag}`, cx, cursorY);
      cursorY += 26 * scale;
    }
  }

  if (showBranding) {
    ctx.fillStyle = '#A89D8A';
    ctx.font = `400 ${Math.round(12 * scale)}px "Inter", system-ui, sans-serif`;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('Wedding Waitress · Photo Booth', cx, y + height - 10 * scale);
  }
}

interface ComposeOpts {
  title: string;
  dateText: string;
  hashtag?: string;
  bottomText: string | null;
  logoUrl: string | null;
  templateUrl: string | null;
  showBranding: boolean;
}

// Single photo composer — keeps captured orientation (portrait or landscape).
async function composeSingle(photo: Blob, opts: ComposeOpts): Promise<Blob> {
  const photoImg = await new Promise<HTMLImageElement>((res, rej) => {
    const img = new Image();
    const url = URL.createObjectURL(photo);
    img.onload = () => { URL.revokeObjectURL(url); res(img); };
    img.onerror = (e) => { URL.revokeObjectURL(url); rej(e); };
    img.src = url;
  });

  const portrait = photoImg.height >= photoImg.width;
  // Target sizes (px) — matches dashboard guidance: 1080×1800 portrait, 1800×1080 landscape.
  const W = portrait ? 1080 : 1800;
  const H = portrait ? 1800 : 1080;
  const footerH = portrait ? 360 : 240;
  const photoAreaH = H - footerH;
  const pad = 24;

  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not available');

  // Background
  let templateImg: HTMLImageElement | null = null;
  if (opts.templateUrl) {
    try { templateImg = await loadImageEl(opts.templateUrl); } catch { templateImg = null; }
  }
  if (templateImg) {
    drawCover(ctx, templateImg, 0, 0, W, H);
  } else {
    ctx.fillStyle = '#FBF7F0';
    ctx.fillRect(0, 0, W, H);
  }

  // Photo slot
  const slotX = pad, slotY = pad, slotW = W - pad * 2, slotH = photoAreaH - pad;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(slotX - 4, slotY - 4, slotW + 8, slotH + 8);
  drawCover(ctx, photoImg, slotX, slotY, slotW, slotH);
  ctx.strokeStyle = '#D9CFBE';
  ctx.lineWidth = 2;
  ctx.strokeRect(slotX, slotY, slotW, slotH);

  await drawFooter(ctx, {
    x: 0, y: photoAreaH, width: W, height: footerH,
    bottomText: opts.bottomText,
    logoUrl: opts.logoUrl,
    fallbackTitle: opts.title,
    dateText: opts.dateText,
    hashtag: opts.hashtag,
    showBranding: opts.showBranding,
    hasTemplate: !!templateImg,
    scale: portrait ? 1.4 : 1,
  });

  const blob: Blob | null = await new Promise(res => canvas.toBlob(b => res(b), 'image/jpeg', 0.92));
  if (!blob) throw new Error('Could not compose photo');
  return blob;
}

// Photo strip composer — builds ONE vertical strip onto an offscreen canvas,
// then renders it TWICE side-by-side on a landscape print canvas (1440×2000).
async function composeStrip(photos: Blob[], opts: ComposeOpts): Promise<Blob> {
  // Single strip dimensions (one half of the print)
  const STRIP_W = 720;
  const STRIP_H = 2000;
  const padding = 36;
  const photoW = STRIP_W - padding * 2; // 648
  const photoH = Math.round(photoW * 0.75); // 486 — 4:3
  const gap = 16;
  const footerH = STRIP_H - (padding + photoH * STRIP_COUNT + gap * (STRIP_COUNT - 1));

  const stripCanvas = document.createElement('canvas');
  stripCanvas.width = STRIP_W; stripCanvas.height = STRIP_H;
  const sctx = stripCanvas.getContext('2d');
  if (!sctx) throw new Error('Canvas not available');

  // Background per strip
  let templateImg: HTMLImageElement | null = null;
  if (opts.templateUrl) {
    try { templateImg = await loadImageEl(opts.templateUrl); } catch { templateImg = null; }
  }
  if (templateImg) {
    // The strip pulls the LEFT half of the template artwork (the print artwork is landscape).
    const iw = templateImg.width;
    const ih = templateImg.height;
    // Source = left half, cover into strip
    drawCover(sctx, templateImg, 0, 0, STRIP_W, STRIP_H);
    // overwrite by cropping left half cleanly
    sctx.clearRect(0, 0, STRIP_W, STRIP_H);
    const halfW = iw / 2;
    // cover-fit left half into strip
    const ir = halfW / ih;
    const tr = STRIP_W / STRIP_H;
    let sx = 0, sy = 0, sw = halfW, sh = ih;
    if (ir > tr) { sw = ih * tr; sx = (halfW - sw) / 2; }
    else { sh = halfW / tr; sy = (ih - sh) / 2; }
    sctx.drawImage(templateImg, sx, sy, sw, sh, 0, 0, STRIP_W, STRIP_H);
  } else {
    sctx.fillStyle = '#FBF7F0';
    sctx.fillRect(0, 0, STRIP_W, STRIP_H);
    sctx.strokeStyle = '#E8E1D6';
    sctx.lineWidth = 2;
    sctx.strokeRect(8, 8, STRIP_W - 16, STRIP_H - 16);
  }

  // Photos
  for (let i = 0; i < STRIP_COUNT; i++) {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const im = new Image();
      const url = URL.createObjectURL(photos[i]);
      im.onload = () => { URL.revokeObjectURL(url); res(im); };
      im.onerror = (e) => { URL.revokeObjectURL(url); rej(e); };
      im.src = url;
    });
    const x = padding;
    const y = padding + i * (photoH + gap);
    sctx.fillStyle = '#FFFFFF';
    sctx.fillRect(x - 4, y - 4, photoW + 8, photoH + 8);
    drawCover(sctx, img, x, y, photoW, photoH);
    sctx.strokeStyle = '#D9CFBE';
    sctx.lineWidth = 1;
    sctx.strokeRect(x, y, photoW, photoH);
  }

  // Footer on the strip
  await drawFooter(sctx, {
    x: 0,
    y: padding + photoH * STRIP_COUNT + gap * (STRIP_COUNT - 1),
    width: STRIP_W,
    height: footerH,
    bottomText: opts.bottomText,
    logoUrl: opts.logoUrl,
    fallbackTitle: opts.title,
    dateText: opts.dateText,
    hashtag: opts.hashtag,
    showBranding: opts.showBranding,
    hasTemplate: !!templateImg,
    scale: 1,
  });

  // Compose final landscape print: 1440×2000 — two strips side-by-side
  const PRINT_W = STRIP_W * 2; // 1440
  const PRINT_H = STRIP_H;     // 2000
  const out = document.createElement('canvas');
  out.width = PRINT_W; out.height = PRINT_H;
  const octx = out.getContext('2d');
  if (!octx) throw new Error('Canvas not available');
  octx.fillStyle = '#FFFFFF';
  octx.fillRect(0, 0, PRINT_W, PRINT_H);
  octx.drawImage(stripCanvas, 0, 0);
  octx.drawImage(stripCanvas, STRIP_W, 0);
  // Cut-line in the middle (light dashed) for real photo-booth feel
  octx.save();
  octx.strokeStyle = '#D9CFBE';
  octx.setLineDash([8, 8]);
  octx.lineWidth = 1;
  octx.beginPath();
  octx.moveTo(STRIP_W, 0);
  octx.lineTo(STRIP_W, PRINT_H);
  octx.stroke();
  octx.restore();

  const blob: Blob | null = await new Promise(res => out.toBlob(b => res(b), 'image/jpeg', 0.92));
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
