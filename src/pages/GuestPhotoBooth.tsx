// Public guest Photo Booth page — /gallery-photobooth/:token
// Supports two modes: 'single' (one photo) and 'strip' (4 photos composed into a wedding strip)
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Camera, Loader2, AlertCircle, RotateCcw, X, Heart, RefreshCw, Download } from 'lucide-react';
import { SeoHead } from '@/components/SEO/SeoHead';
import { safeEventName } from '@/lib/sharedPhotoFilename';
import { GalleryPasswordGate, galleryPasswordKey } from '@/components/Dashboard/PhotoVideoGallery/GalleryPasswordGate';
import { resolveGalleryTheme } from '@/lib/galleryTheme';
import { resolveGalleryTitle } from '@/lib/galleryTitle';
import { usePhotoBoothUpload } from '@/hooks/usePhotoBoothUpload';
import { GalleryFooterLogo } from '@/components/Dashboard/PhotoVideoGallery/GalleryFooterLogo';
import {
  
  composeStripBlob,
  formatEventDate,
  PB_STRIP_COUNT,
  type ComposeOpts,
} from '@/lib/photoBoothTemplate';

const STRIP_COUNT = PB_STRIP_COUNT;
import photoBoothBgAsset from '@/assets/photo-booth-bg.png.asset.json';

const PHOTO_BOOTH_BG = photoBoothBgAsset.url;
const COUNTDOWN_SECONDS = 7;

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
  photo_booth_strip_style: any | null;
}

type Phase = 'preview' | 'captured' | 'saving' | 'saved';



interface GuestPhotoBoothProps {
  /** When embedded in the unified guest app, the token is supplied directly. */
  tokenProp?: string;
  /** When provided, Cancel/close returns to the host app instead of navigating back. */
  onExit?: () => void;
  /** Rendered inline inside the unified guest app (no full-screen chrome/background/header). */
  embedded?: boolean;
  /** Fired after a session is successfully saved to the shared event gallery. */
  onSaved?: () => void;
}

export const GuestPhotoBooth: React.FC<GuestPhotoBoothProps> = ({ tokenProp, onExit, embedded = false, onSaved }) => {
  const params = useParams<{ token: string }>();
  const token = tokenProp ?? params.token;
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
  const [fallbackLinks, setFallbackLinks] = useState<{ name: string; url: string }[]>([]);


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

  // ---- Gallery / Photo Booth configuration loading ----------------------------------
  // A failed load is a *recoverable* state (Retry), never a thrown render error.
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    if (!token) { setLoading(false); setNotFound(true); return; }
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    setNotFound(false);
    setGallery(null);
    (async () => {
      // One silent automatic retry: a single flaky request must not surface as an error.
      for (let attemptNo = 0; attemptNo < 2; attemptNo++) {
        try {
          const { data, error } = await (supabase as any).rpc('get_event_media_gallery_public', { _token: token });
          if (cancelled) return;
          if (error) throw error;
          const row = Array.isArray(data) ? data[0] : data;
          if (!row) setNotFound(true);
          else setGallery(row as GalleryPublic);
          if (!cancelled) { setLoadError(null); setLoading(false); }
          return;
        } catch {
          if (cancelled) return;
          if (attemptNo === 0) {
            await new Promise(r => setTimeout(r, 700));
            if (cancelled) return;
            continue;
          }
          setLoadError('We could not load the Photo Booth. Please check your connection and try again.');
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [token, loadAttempt]);

  const retryLoad = useCallback(() => setLoadAttempt(n => n + 1), []);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setStreamReady(false);
  }, []);

  const [cameraError, setCameraError] = useState<{ kind: 'denied' | 'unavailable' | 'generic'; message: string } | null>(null);
  const [cameraStarting, setCameraStarting] = useState(false);
  // Guards against duplicate getUserMedia calls triggered by re-renders / StrictMode.
  const cameraInitRef = useRef<string | null>(null);

  const startCamera = useCallback(async (fm: 'user' | 'environment') => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setCameraError({ kind: 'unavailable', message: "Camera isn't supported in this browser. Try the latest Chrome, Safari, or Firefox." });
      return;
    }
    setErrorMsg(null);
    setCameraError(null);
    setCameraStarting(true);
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
      const name = e?.name || '';
      if (name === 'NotAllowedError' || name === 'SecurityError' || /Permission/i.test(e?.message || '')) {
        setCameraError({
          kind: 'denied',
          message: 'Camera access is blocked. Tap the padlock (or “aA”) in your browser’s address bar, allow Camera for this site, then tap Retry.',
        });
      } else if (name === 'NotFoundError' || name === 'OverconstrainedError' || name === 'DevicesNotFoundError') {
        setCameraError({ kind: 'unavailable', message: 'No compatible camera was found on this device.' });
      } else if (name === 'NotReadableError' || name === 'TrackStartError') {
        setCameraError({ kind: 'generic', message: 'Your camera is already in use by another app. Close it and tap Retry.' });
      } else {
        setCameraError({ kind: 'generic', message: e?.message || 'We could not start your camera. Please tap Retry.' });
      }
      cameraInitRef.current = null;
    } finally {
      setCameraStarting(false);
    }
  }, [stopStream]);

  const mode: 'single' | 'strip' = gallery?.photo_booth_mode === 'strip' ? 'strip' : 'single';
  // Everything the camera depends on must be loaded before initialisation begins.
  const configReady = !loading && !loadError && !notFound && !!gallery;
  const ready = configReady && !!gallery && gallery.is_open && gallery.photo_booth_enabled && (!gallery.password_required || unlocked);

  // Single initialisation per (ready, phase, facingMode) combination.
  useEffect(() => {
    if (!ready || phase !== 'preview') return;
    const key = `${facingMode}`;
    if (cameraInitRef.current === key && streamRef.current) return;
    cameraInitRef.current = key;
    startCamera(facingMode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, phase, facingMode]);

  // Release the camera when leaving the preview phase or when config is no longer ready.
  useEffect(() => {
    if (ready && phase === 'preview') return;
    cameraInitRef.current = null;
    stopStream();
  }, [ready, phase, stopStream]);

  const retryCamera = useCallback(() => {
    cameraInitRef.current = null;
    setCameraError(null);
    startCamera(facingMode);
  }, [startCamera, facingMode]);

  // Unmount cleanup only — must not depend on changing values.
  const cleanupRef = useRef<() => void>(() => {});
  cleanupRef.current = () => { stopStream(); if (capturedUrl) URL.revokeObjectURL(capturedUrl); };
  useEffect(() => () => { cleanupRef.current(); }, []);


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

  const buildComposeOpts = (): ComposeOpts => {
    const couple = [gallery?.partner1_name, gallery?.partner2_name].filter(Boolean).join(' & ');
    const title = resolveGalleryTitle(gallery);
    const dateText = formatEventDate(gallery?.event_date || null);
    const titleRaw = gallery?.gallery_title || '';
    const hashtag = titleRaw.startsWith('#') ? titleRaw : undefined;
    const isStrip = (gallery?.photo_booth_mode === 'strip');
    return {
      title,
      dateText,
      hashtag,
      bottomText: (isStrip ? gallery?.photo_booth_strip_bottom_text : gallery?.photo_booth_single_bottom_text) || null,
      logoUrl: (isStrip ? gallery?.photo_booth_strip_logo_url : gallery?.photo_booth_single_logo_url) || null,
      templateUrl: (isStrip ? gallery?.photo_booth_strip_template_url : gallery?.photo_booth_single_template_url) || null,
      showBranding: !!gallery?.show_branding,
      style: isStrip ? (gallery?.photo_booth_strip_style || null) : null,
    };
  };

  const captureSingle = async () => {
    const blob = await grabFrameBlob();
    if (!blob) { setErrorMsg('Could not capture photo'); return; }
    try {
      // Individual photos are always saved as the original raw capture — no template styling.
      const finalBlob = blob;
      setCapturedBlob(finalBlob);
      if (capturedUrl) URL.revokeObjectURL(capturedUrl);
      setCapturedUrl(URL.createObjectURL(finalBlob));
      setPhase('captured');
      stopStream();
    } catch (e: any) {
      setErrorMsg(e?.message || 'Could not compose photo');
    }
  };

  const captureStripFrame = async () => {
    const blob = await grabFrameBlob();
    if (!blob) { setErrorMsg('Could not capture photo'); setStripActive(false); return; }
    setFlash(true);
    setTimeout(() => setFlash(false), 180);
    const nextPhotos = [...stripPhotos, blob];
    setStripPhotos(nextPhotos);
    if (nextPhotos.length < STRIP_COUNT) {
      setTimeout(() => setCountdown(COUNTDOWN_SECONDS), 700);
    } else {
      setStripActive(false);
      try {
        const stripBlob = await composeStripBlob(nextPhotos, buildComposeOpts());
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
    if (!name.trim()) { setErrorMsg('Please add your full name first.'); return; }
    setErrorMsg(null);
    if (mode === 'strip') {
      setStripPhotos([]);
      setStripActive(true);
    }
    setCountdown(COUNTDOWN_SECONDS);
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
    if (capturedUrl) URL.revokeObjectURL(capturedUrl);
    setCapturedUrl(null);
    setCapturedBlob(null);
    setStripPhotos([]);
    setStripActive(false);
    setCountdown(null);
    setErrorMsg(null);
    // Embedded in the unified guest app: reset only, stay on the Photo Booth tab.
    if (embedded) { setPhase('preview'); return; }
    stopStream();
    if (onExit) { onExit(); return; }
    if (window.history.length > 1) window.history.back();
    else window.close();
  };

  // ---- Downloads (guest keeps a copy of the strip + original captures) ----
  const baseName = safeEventName(gallery?.event_name);

  // Mobile / tablet use the native share sheet; desktop keeps the existing anchor downloads.
  const isTouchDevice = typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0;

  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  const clearFallback = () => {
    fallbackLinks.forEach(l => URL.revokeObjectURL(l.url));
    setFallbackLinks([]);
  };

  const buildFileList = (): { blob: Blob; name: string }[] => {
    if (!capturedBlob) return [];
    return [
      { blob: capturedBlob, name: `${baseName}-Photo-Strip.jpg` },
      ...stripPhotos.map((b, i) => ({ blob: b, name: `${baseName}-Photo-${i + 1}.jpg` })),
    ];
  };

  // Files are prepared as soon as the strip is complete, so the share() call stays
  // directly attached to the guest's tap (required by iOS Safari).
  const preparedRef = useRef<File[] | null>(null);
  useEffect(() => {
    if (phase !== 'captured' || !capturedBlob) { preparedRef.current = null; return; }
    preparedRef.current = buildFileList().map(f => new File([f.blob], f.name, { type: 'image/jpeg' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, capturedBlob, stripPhotos, baseName]);

  const showFallbackLinks = () => {
    clearFallback();
    setFallbackLinks(buildFileList().map(f => ({ name: f.name, url: URL.createObjectURL(f.blob) })));
  };

  const downloadAll = async () => {
    const files = preparedRef.current ?? buildFileList().map(f => new File([f.blob], f.name, { type: 'image/jpeg' }));
    if (files.length === 0) return;

    const nav = navigator as Navigator & { canShare?: (d: any) => boolean; share?: (d: any) => Promise<void> };
    if (isTouchDevice && nav.share && nav.canShare && nav.canShare({ files })) {
      try {
        await nav.share({ files });
      } catch (e: any) {
        // Closing the sheet is a cancellation — stay silent.
        if (e?.name !== 'AbortError') showFallbackLinks();
      }
      return;
    }

    files.forEach((f, i) => setTimeout(() => triggerDownload(f, f.name), i * 400));
  };

  // Guards against saving the same completed session twice (double tap / retry after a failed save).
  const savingRef = useRef(false);
  const savedRef = useRef(false);

  const downloadAndSave = async () => {
    if (!capturedBlob || !token) return;
    if (!name.trim()) { setErrorMsg('Please add your full name first.'); return; }
    if (savingRef.current) return;
    savingRef.current = true;
    setPhase('saving');
    setErrorMsg(null);

    // Download first so the native share sheet still counts as a user gesture.
    await downloadAll();

    if (savedRef.current) {
      setPhase('saved');
      savingRef.current = false;
      return;
    }

    const prefix = mode === 'strip' ? 'photobooth-strip' : 'photobooth';
    const stamp = Date.now();
    const uploaderName = name.trim();
    const ok = await upload(capturedBlob, {
      token,
      mime: 'image/jpeg',
      uploaderName,
      filename: `${prefix}-${stamp}.jpg`,
      isStrip: mode === 'strip',
    });
    if (ok) {
      // Also store each individual capture from the strip so all 5 images land in the gallery.
      const singles = mode === 'strip' ? stripPhotos : [];
      for (let i = 0; i < singles.length; i++) {
        await upload(singles[i], {
          token,
          mime: 'image/jpeg',
          uploaderName,
          filename: `photobooth-${stamp}-${i + 1}.jpg`,
          isStrip: false,
        });
      }
      savedRef.current = true;
      setPhase('saved');
      if (capturedUrl) URL.revokeObjectURL(capturedUrl);
      setCapturedBlob(null);
      setCapturedUrl(null);
      setStripPhotos([]);
      onSaved?.();
    } else {
      setPhase('captured');
      setErrorMsg('Your photos could not be added to the gallery. Please tap “Download and Save” to try again.');
    }
    savingRef.current = false;
  };


  const theme = resolveGalleryTheme(gallery);
  const accent = theme.themeColor;
  const accentSoftBg = `${accent}1A`;

  if (loading) {
    const preparing = (
      <div className="flex flex-col items-center justify-center gap-3 py-12" role="status" aria-live="polite">
        <Loader2 className="animate-spin h-8 w-8" style={{ color: accent }} />
        <p className={`text-base font-medium ${embedded ? 'text-white' : theme.textClass}`}>Opening Photo Booth…</p>
      </div>
    );
    return embedded
      ? preparing
      : <div className={`min-h-screen flex items-center justify-center ${theme.bgClass}`} style={theme.pageStyle}>{preparing}</div>;
  }
  if (loadError) {
    const errorCard = (
      <Card className={`p-8 max-w-md mx-auto text-center ${theme.surfaceClass} ${theme.textClass}`}>
        <AlertCircle className="h-10 w-10 mx-auto mb-4 text-red-500" />
        <h2 className="text-lg font-semibold mb-2">We couldn’t open the Photo Booth</h2>
        <p className={`text-sm ${theme.mutedClass}`}>{loadError}</p>
        <Button type="button" className="lv-premium-shade mt-5 h-11 w-full text-white" style={{ backgroundColor: accent }} onClick={retryLoad}>
          <RotateCcw className="h-4 w-4 mr-2" /> Retry
        </Button>
      </Card>
    );
    return embedded ? <div className="py-8">{errorCard}</div> : (
      <div className={`min-h-screen flex items-center justify-center px-4 ${theme.bgClass}`} style={theme.pageStyle}>{errorCard}</div>
    );
  }
  if (notFound || !gallery) {
    return (
      <div className={`min-h-screen flex items-center justify-center px-4 ${theme.bgClass}`} style={theme.pageStyle}>
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
      <div className={`min-h-screen flex items-center justify-center px-4 ${theme.bgClass}`} style={theme.pageStyle}>
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
  const title = resolveGalleryTitle(gallery);
  const isCameraSupported = typeof window !== 'undefined' && !!navigator?.mediaDevices?.getUserMedia;
  const startLabel = mode === 'strip' ? 'Start Photo Strip' : 'Start Photo Booth';
  const stripProgress = stripPhotos.length; // 0..STRIP_COUNT
  const stripBusy = stripActive || (mode === 'strip' && countdown !== null);

  return (
    <div className={embedded ? 'relative overflow-x-hidden' : 'relative min-h-screen px-4 py-6 pt-8 overflow-x-hidden'}>
      {!embedded && (
        <>
          <SeoHead title={`${gallery.event_name} — Photo Booth`} description="Snap a photo straight into the event gallery." />
          <div
            className="fixed inset-0"
            style={{ backgroundImage: `url(${PHOTO_BOOTH_BG})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat', backgroundColor: '#2b1a12' }}
            aria-hidden="true"
          />
          <div className="fixed inset-0 bg-black/25" aria-hidden="true" />
        </>
      )}
      <div className="relative z-10 max-w-md mx-auto">
        {!embedded && (
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-3 border border-white/20" style={{ backgroundColor: accentSoftBg }}>
            <Camera className="h-6 w-6" style={{ color: accent }} />
          </div>
          <h1 className="text-2xl font-semibold leading-tight text-white">Digital Photo Booth</h1>
          <p className="text-lg mt-1 text-white/90">{title}</p>
          <p className="text-sm mt-2 text-white/70">
            {mode === 'strip' ? `Get ready to take ${STRIP_COUNT} photos.` : 'Get ready to take a photo.'}
          </p>
        </div>
        )}

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
              {onExit && (
                <Button type="button" variant="ghost" className="w-full h-11 text-base" onClick={() => { stopStream(); onExit(); }}>
                  <X className="h-4 w-4 mr-2" /> Close Photo Booth
                </Button>
              )}
            </div>
          </Card>
        ) : (
          <Card className={`p-5 space-y-5 border border-[#472c1d] ${theme.surfaceClass} ${theme.textClass}`}>
            <div>
              <Label htmlFor="pb-name" className="text-base font-medium">Your Full Name <span className="text-red-500">*</span></Label>
              <Input id="pb-name" className="h-12 text-base mt-2 border border-[#472c1d]" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Sarah Jones" />
            </div>

            {!isCameraSupported && (
              <div className="rounded-md border border-amber-300 bg-amber-50 text-amber-900 text-sm p-3">
                Camera isn't supported in this browser. Try the latest Chrome, Safari, or Firefox.
              </div>
            )}

            {isCameraSupported && cameraError && (
              <div className="rounded-md border border-amber-300 bg-amber-50 text-amber-900 text-sm p-3 space-y-3" role="alert">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /> <span>{cameraError.message}</span>
                </div>
                {cameraError.kind !== 'unavailable' && (
                  <Button
                    type="button"
                    className="lv-premium-shade w-full h-10 text-white"
                    style={{ backgroundColor: accent }}
                    onClick={retryCamera}
                    disabled={cameraStarting}
                  >
                    {cameraStarting
                      ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Retrying…</>
                      : <><RotateCcw className="h-4 w-4 mr-2" /> Retry</>}
                  </Button>
                )}
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
                  className="max-h-[70vh] w-auto mx-auto object-contain"
                />
              </div>
            ) : (
              <div className="rounded-lg overflow-hidden bg-black aspect-[3/4] relative border border-[#472c1d]">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  style={facingMode === 'user' ? { transform: 'scaleX(-1)' } : undefined}
                  playsInline muted autoPlay
                />
                {phase === 'preview' && !streamReady && !cameraError && isCameraSupported && countdown === null && (
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
            {mode === 'strip' && phase === 'preview' && (
              <div className="flex gap-2 justify-center">
                {Array.from({ length: STRIP_COUNT }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-12 h-16 rounded border border-[#472c1d] ${i < stripProgress ? 'bg-[#967A59]/15' : 'bg-muted/40'}`}
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
                  variant="ghost"
                  className="w-full h-12 text-white text-base bg-green-500 hover:bg-green-600 shadow-none"
                  disabled={!isCameraSupported || !streamReady || countdown !== null || stripActive}
                  onClick={startCountdown}
                >
                  <Camera className="h-5 w-5 mr-2" />
                  {countdown !== null ? `Get ready… ${countdown || ''}` : startLabel}
                </Button>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    className="flex-1 h-11 text-base bg-[#967A59] text-white hover:bg-[#7d6649] border border-[#472c1d] shadow-none"
                    onClick={flipCamera}
                    disabled={!isCameraSupported || countdown !== null || stripActive}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" /> Flip
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="flex-1 h-11 text-base bg-red-500 text-white hover:bg-red-600 border border-[#472c1d] shadow-none"
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
                  onClick={downloadAndSave}
                  disabled={uploading || phase === 'saving' || !capturedBlob}
                >
                  {uploading || phase === 'saving' ? (
                    <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Saving…</>
                  ) : (
                    <><Download className="h-5 w-5 mr-2" /> Download and Save</>
                  )}
                </Button>
                {fallbackLinks.length > 0 && (
                  <div className="space-y-2">
                    {fallbackLinks.map(l => (
                      <a
                        key={l.name}
                        href={l.url}
                        download={l.name}
                        className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"
                      >
                        <Download className="h-4 w-4 shrink-0" /> <span className="truncate">{l.name}</span>
                      </a>
                    ))}
                  </div>
                )}
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

        {!embedded && theme.showBranding && (
          <div className="mt-8 flex justify-center">
            <GalleryFooterLogo />
          </div>
        )}
      </div>
    </div>
  );

};

export default GuestPhotoBooth;
