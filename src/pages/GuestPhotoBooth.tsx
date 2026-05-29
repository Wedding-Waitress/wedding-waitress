// Public guest Photo Booth page — /gallery-photobooth/:token
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
}

type Phase = 'preview' | 'captured' | 'saving' | 'saved';

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

  // Auto-start camera when ready (unlocked + open + enabled)
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

  const capture = async () => {
    if (!videoRef.current || !streamReady) return;
    const v = videoRef.current;
    const w = v.videoWidth || 1280;
    const h = v.videoHeight || 720;
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(v, 0, 0, w, h);
    const blob: Blob | null = await new Promise(res => canvas.toBlob(b => res(b), 'image/jpeg', 0.9));
    if (!blob) { setErrorMsg('Could not capture photo'); return; }
    setCapturedBlob(blob);
    if (capturedUrl) URL.revokeObjectURL(capturedUrl);
    setCapturedUrl(URL.createObjectURL(blob));
    setPhase('captured');
    stopStream();
  };

  const retake = () => {
    if (capturedUrl) URL.revokeObjectURL(capturedUrl);
    setCapturedUrl(null);
    setCapturedBlob(null);
    setPhase('preview');
  };

  const cancel = () => {
    stopStream();
    if (capturedUrl) URL.revokeObjectURL(capturedUrl);
    setCapturedUrl(null);
    setCapturedBlob(null);
    setErrorMsg(null);
    if (window.history.length > 1) window.history.back();
    else window.close();
  };

  const save = async () => {
    if (!capturedBlob || !token) return;
    if (!name.trim()) { setErrorMsg('Please add your first name first.'); return; }
    setPhase('saving');
    setErrorMsg(null);
    const filename = `photobooth-${Date.now()}.jpg`;
    const ok = await upload(capturedBlob, {
      token,
      mime: 'image/jpeg',
      uploaderName: name.trim(),
      filename,
    });
    if (ok) {
      setPhase('saved');
      if (capturedUrl) URL.revokeObjectURL(capturedUrl);
      setCapturedBlob(null);
      setCapturedUrl(null);
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
          <h1 className="text-2xl font-semibold leading-tight">Photo Booth</h1>
          <p className={`text-sm mt-2 ${theme.mutedClass}`}>Take a photo for {title}.</p>
        </div>

        {phase === 'saved' ? (
          <Card className={`p-7 text-center ${theme.surfaceClass} ${theme.textClass}`}>
            <div className="inline-flex w-16 h-16 rounded-full items-center justify-center mb-4" style={{ backgroundColor: accentSoftBg }}>
              <Heart className="h-8 w-8" style={{ color: accent }} fill={accent} />
            </div>
            <h2 className="text-xl font-semibold">Thanks{name.trim() ? `, ${name.trim().split(/\s+/)[0]}` : ''}!</h2>
            <p className={`text-sm mt-2 ${theme.mutedClass}`}>Your photo has been added to the gallery.</p>
            <div className="mt-6 space-y-2">
              <Button
                className="lv-premium-shade w-full h-11 text-white"
                style={{ backgroundColor: accent }}
                onClick={() => { setPhase('preview'); }}
              >
                Take another photo
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

            <div className="rounded-lg overflow-hidden bg-black aspect-[3/4] relative">
              {phase === 'captured' && capturedUrl ? (
                <img src={capturedUrl} alt="Captured" className="w-full h-full object-cover" />
              ) : (
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  style={facingMode === 'user' ? { transform: 'scaleX(-1)' } : undefined}
                  playsInline muted autoPlay
                />
              )}
              {phase === 'preview' && !streamReady && isCameraSupported && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white text-sm">
                  <Loader2 className="animate-spin h-6 w-6 mr-2" /> Starting camera…
                </div>
              )}
            </div>

            {phase === 'preview' && (
              <div className="space-y-2.5">
                <Button
                  type="button"
                  className="lv-premium-shade w-full h-12 text-white text-base"
                  style={{ backgroundColor: accent }}
                  disabled={!isCameraSupported || !streamReady}
                  onClick={capture}
                >
                  <Camera className="h-5 w-5 mr-2" /> Take Photo
                </Button>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="lv-premium-shade flex-1 h-11 text-base"
                    onClick={flipCamera}
                    disabled={!isCameraSupported}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" /> Flip
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="flex-1 h-11 text-base"
                    onClick={cancel}
                  >
                    <X className="h-4 w-4 mr-2" /> Cancel
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
