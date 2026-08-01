// Public guest Voice Guestbook page — /gallery-guestbook/:token
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Video, Mic, Square, Loader2, AlertCircle, CheckCircle2, RotateCcw, Trash2, Save, X, Heart } from 'lucide-react';
import { SeoHead } from '@/components/SEO/SeoHead';
import { GalleryPasswordGate, galleryPasswordKey } from '@/components/Dashboard/PhotoVideoGallery/GalleryPasswordGate';
import { resolveGalleryTheme } from '@/lib/galleryTheme';
import { resolveGalleryTitle } from '@/lib/galleryTitle';
import { useGuestbookUpload } from '@/hooks/useGuestbookUpload';
import { GalleryFooterLogo } from '@/components/Dashboard/PhotoVideoGallery/GalleryFooterLogo';

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
  video_guestbook_enabled: boolean;
}

const MAX_SECONDS = 60;

type Mode = 'idle' | 'video' | 'audio';
type Phase = 'choose' | 'preview' | 'recording' | 'review' | 'saving' | 'saved';

function pickVideoMime(): string {
  const cands = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'];
  for (const c of cands) { try { if ((window as any).MediaRecorder?.isTypeSupported?.(c)) return c; } catch {} }
  return 'video/webm';
}
function pickAudioMime(): string {
  const cands = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
  for (const c of cands) { try { if ((window as any).MediaRecorder?.isTypeSupported?.(c)) return c; } catch {} }
  return 'audio/webm';
}
function normalizeMime(m: string): string {
  // strip codec hints — backend allow-list checks the base mime
  return (m || '').split(';')[0].trim();
}
function extFor(mime: string): string {
  switch (normalizeMime(mime)) {
    case 'video/webm': return 'webm';
    case 'video/mp4': return 'mp4';
    case 'audio/webm': return 'webm';
    case 'audio/mp4': return 'm4a';
    case 'audio/ogg': return 'ogg';
    default: return 'webm';
  }
}

export const GuestVideoGuestbook: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [gallery, setGallery] = useState<GalleryPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [mode, setMode] = useState<Mode>('idle');
  const [phase, setPhase] = useState<Phase>('choose');
  const [seconds, setSeconds] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [recordedMime, setRecordedMime] = useState<string>('');

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<number | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const startTimeRef = useRef<number>(0);

  const { upload, progress, uploading } = useGuestbookUpload();

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
  }, []);

  const cleanupRecorder = useCallback(() => {
    if (timerRef.current) { window.clearInterval(timerRef.current); timerRef.current = null; }
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      try { recorderRef.current.stop(); } catch {}
    }
    recorderRef.current = null;
  }, []);

  useEffect(() => () => { cleanupRecorder(); stopStream(); if (recordedUrl) URL.revokeObjectURL(recordedUrl); }, [cleanupRecorder, stopStream, recordedUrl]);

  const startSession = async (m: Mode) => {
    setErrorMsg(null);
    setMode(m);
    setSeconds(0);
    setRecordedBlob(null);
    if (recordedUrl) { URL.revokeObjectURL(recordedUrl); setRecordedUrl(null); }
    try {
      const constraints: MediaStreamConstraints = m === 'video'
        ? { audio: true, video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } }
        : { audio: true, video: false };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      setPhase('preview');
      if (m === 'video' && videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        videoPreviewRef.current.muted = true;
        await videoPreviewRef.current.play().catch(() => {});
      }
    } catch (e: any) {
      setErrorMsg(e?.message?.includes('Permission') || e?.name === 'NotAllowedError'
        ? 'Permission denied. Please allow microphone' + (m === 'video' ? ' and camera' : '') + ' access.'
        : (e?.message || 'Could not access your device'));
      setPhase('choose');
      setMode('idle');
    }
  };

  const startRecording = () => {
    if (!streamRef.current) return;
    setErrorMsg(null);
    chunksRef.current = [];
    const mimeType = mode === 'video' ? pickVideoMime() : pickAudioMime();
    let mr: MediaRecorder;
    try {
      mr = new MediaRecorder(streamRef.current, { mimeType });
    } catch {
      mr = new MediaRecorder(streamRef.current);
    }
    setRecordedMime(mr.mimeType || mimeType);
    mr.ondataavailable = (ev) => { if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data); };
    mr.onstop = () => {
      const finalMime = normalizeMime(mr.mimeType || mimeType);
      const blob = new Blob(chunksRef.current, { type: finalMime });
      setRecordedBlob(blob);
      const url = URL.createObjectURL(blob);
      setRecordedUrl(url);
      setRecordedMime(finalMime);
      setPhase('review');
      stopStream();
    };
    recorderRef.current = mr;
    startTimeRef.current = Date.now();
    mr.start(250);
    setPhase('recording');
    setSeconds(0);
    timerRef.current = window.setInterval(() => {
      const s = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setSeconds(s);
      if (s >= MAX_SECONDS) {
        stopRecording();
      }
    }, 200);
  };

  const stopRecording = () => {
    if (timerRef.current) { window.clearInterval(timerRef.current); timerRef.current = null; }
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      try { recorderRef.current.stop(); } catch {}
    }
  };

  const retake = () => {
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordedUrl(null);
    setRecordedBlob(null);
    setSeconds(0);
    if (mode !== 'idle') startSession(mode);
  };

  const cancel = () => {
    cleanupRecorder();
    stopStream();
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordedUrl(null);
    setRecordedBlob(null);
    setSeconds(0);
    setMode('idle');
    setPhase('choose');
    setErrorMsg(null);
  };

  const save = async () => {
    if (!recordedBlob || !token || mode === 'idle') return;
    if (!name.trim()) {
      setErrorMsg('Please add your full name first.');
      return;
    }
    const dur = Math.min(MAX_SECONDS, Math.max(1, seconds || 1));
    const mime = normalizeMime(recordedMime || recordedBlob.type || (mode === 'video' ? 'video/webm' : 'audio/webm'));
    const filename = `guestbook-${mode}-${Date.now()}.${extFor(mime)}`;
    setPhase('saving');
    setErrorMsg(null);
    const ok = await upload(recordedBlob, {
      token,
      kind: mode,
      mime,
      durationSec: dur,
      uploaderName: name.trim(),
      message: message.trim(),
      filename,
    });
    if (ok) {
      setPhase('saved');
      if (recordedUrl) URL.revokeObjectURL(recordedUrl);
      setRecordedBlob(null);
      setRecordedUrl(null);
    } else {
      setPhase('review');
      setErrorMsg('Could not upload your message. Please try again.');
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
          <h1 className="text-xl font-semibold mb-2">Guestbook link not found</h1>
          <p className={`text-sm ${theme.mutedClass}`}>This link is invalid or has been closed by the host.</p>
        </Card>
      </div>
    );
  }
  if (gallery.password_required && !unlocked && token) {
    return <GalleryPasswordGate token={token} title={`${gallery.event_name} — password required`} onVerified={() => setUnlocked(true)} theme={theme} />;
  }
  if (!gallery.is_open || !gallery.video_guestbook_enabled) {
    return (
      <div className={`min-h-screen flex items-center justify-center px-4 ${theme.bgClass}`}>
        <Card className={`p-8 max-w-md text-center ${theme.surfaceClass} ${theme.textClass}`}>
          <Video className="h-12 w-12 mx-auto mb-4" style={{ color: accent }} />
          <h1 className="text-xl font-semibold mb-2">{gallery.event_name}</h1>
          <p className={`text-sm ${theme.mutedClass}`}>
            {!gallery.is_open ? 'The host has closed this gallery.' : 'The Voice Guestbook is not enabled for this event.'}
          </p>
        </Card>
      </div>
    );
  }

  const couple = [gallery.partner1_name, gallery.partner2_name].filter(Boolean).join(' & ');
  const title = resolveGalleryTitle(gallery);
  const isMediaRecorderSupported = typeof window !== 'undefined' && !!(window as any).MediaRecorder && !!navigator?.mediaDevices?.getUserMedia;

  return (
    <div className={`min-h-screen px-4 py-6 pt-8 overflow-x-hidden ${theme.bgClass} ${theme.textClass}`}>
      <SeoHead title={`${gallery.event_name} — Voice Guestbook`} description="Leave a short video or voice message for the couple." />
      <div className="max-w-md mx-auto">
        <div className="text-center mb-6">
          {theme.logoImageUrl ? (
            <img src={theme.logoImageUrl} alt="" className="mx-auto max-h-16 mb-3 object-contain" />
          ) : (
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-3" style={{ backgroundColor: accentSoftBg }}>
              <Video className="h-8 w-8" style={{ color: accent }} />
            </div>
          )}
          <h1 className="text-2xl font-semibold leading-tight">Voice Guestbook</h1>
          <p className={`text-sm mt-2 ${theme.mutedClass}`}>Leave a short message for {title} — up to {MAX_SECONDS} seconds.</p>
        </div>

        {phase === 'saved' ? (
          <Card className={`p-7 text-center ${theme.surfaceClass} ${theme.textClass}`}>
            <div className="inline-flex w-16 h-16 rounded-full items-center justify-center mb-4" style={{ backgroundColor: accentSoftBg }}>
              <Heart className="h-8 w-8" style={{ color: accent }} fill={accent} />
            </div>
            <h2 className="text-xl font-semibold">Thank you{name.trim() ? `, ${name.trim().split(/\s+/)[0]}` : ''}!</h2>
            <p className={`text-sm mt-2 ${theme.mutedClass}`}>Your message has been sent to {couple || 'the couple'}.</p>
            <div className="mt-6 space-y-2">
              <Button
                className="lv-premium-shade w-full h-11 text-white"
                style={{ backgroundColor: accent }}
                onClick={() => { setPhase('choose'); setMessage(''); }}
              >
                Leave another message
              </Button>
            </div>
            {theme.showBranding && <GalleryFooterLogo className="mt-4" />}
          </Card>
        ) : (
          <Card className={`p-5 space-y-5 ${theme.surfaceClass} ${theme.textClass}`}>
            <div>
              <Label htmlFor="gb-name" className="text-base font-medium">Your full name <span className="text-red-500">*</span></Label>
              <Input id="gb-name" className="h-12 text-base mt-2" value={name} onChange={e => setName(e.target.value)} placeholder="Enter your full name" />
            </div>
            <div>
              <Label htmlFor="gb-msg" className="text-base font-medium">Add a short note (optional)</Label>
              <Textarea id="gb-msg" className="mt-2 min-h-[64px]" value={message} onChange={e => setMessage(e.target.value)} maxLength={500} placeholder="Anything you'd like to say in writing too…" />
            </div>

            {!isMediaRecorderSupported && (
              <div className="rounded-md border border-amber-300 bg-amber-50 text-amber-900 text-sm p-3">
                Recording isn't supported in this browser. Try the latest Chrome, Safari, or Firefox.
              </div>
            )}

            {errorMsg && (
              <div className="rounded-md border border-red-300 bg-red-50 text-red-900 text-sm p-3 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /> <span>{errorMsg}</span>
              </div>
            )}

            {phase === 'choose' && (
              <div className="space-y-2.5">
                <Button
                  className="lv-premium-shade w-full h-12 text-white text-base"
                  style={{ backgroundColor: accent }}
                  disabled={!isMediaRecorderSupported}
                  onClick={() => startSession('video')}
                >
                  <Video className="h-5 w-5 mr-2" /> Leave Video Message
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="lv-premium-shade w-full h-12 text-base"
                  disabled={!isMediaRecorderSupported}
                  onClick={() => startSession('audio')}
                >
                  <Mic className="h-5 w-5 mr-2" /> Leave Voice Message
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full h-11 text-base"
                  onClick={() => window.history.length > 1 ? window.history.back() : window.close()}
                >
                  <X className="h-4 w-4 mr-2" /> Cancel
                </Button>
              </div>
            )}

            {(phase === 'preview' || phase === 'recording') && mode !== 'idle' && (
              <div className="space-y-3">
                {mode === 'video' ? (
                  <div className="rounded-lg overflow-hidden bg-black aspect-video">
                    <video ref={videoPreviewRef} className="w-full h-full object-cover" playsInline muted autoPlay />
                  </div>
                ) : (
                  <div className="rounded-lg bg-muted aspect-video flex items-center justify-center">
                    <Mic className="h-12 w-12" style={{ color: accent }} />
                  </div>
                )}
                <div className="flex items-center justify-center gap-2 text-sm">
                  {phase === 'recording' && <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />}
                  <span className="font-medium tabular-nums">{String(seconds).padStart(2, '0')}s / {MAX_SECONDS}s</span>
                </div>
                <div className="flex gap-2">
                  {phase === 'preview' ? (
                    <Button
                      className="lv-premium-shade flex-1 h-12 text-white text-base"
                      style={{ backgroundColor: accent }}
                      onClick={startRecording}
                    >
                      {mode === 'video' ? <Video className="h-5 w-5 mr-2" /> : <Mic className="h-5 w-5 mr-2" />}
                      Start recording
                    </Button>
                  ) : (
                    <Button
                      className="lv-premium-shade flex-1 h-12 text-white text-base bg-red-600 hover:bg-red-700"
                      onClick={stopRecording}
                    >
                      <Square className="h-5 w-5 mr-2" fill="currentColor" /> Stop
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    className="lv-premium-shade h-12 text-base"
                    onClick={cancel}
                  >
                    <X className="h-4 w-4 mr-1" /> Cancel
                  </Button>
                </div>
              </div>
            )}

            {phase === 'review' && recordedUrl && (
              <div className="space-y-3">
                <div className="rounded-lg overflow-hidden bg-black">
                  {mode === 'video' ? (
                    <video src={recordedUrl} className="w-full aspect-video object-contain bg-black" controls playsInline />
                  ) : (
                    <div className="bg-muted p-4">
                      <audio src={recordedUrl} controls className="w-full" />
                    </div>
                  )}
                </div>
                <p className={`text-center text-sm ${theme.mutedClass}`}>
                  Recorded {seconds}s · {mode === 'video' ? 'Video' : 'Voice'} message
                </p>
                <div className="space-y-2">
                  <Button
                    className="lv-premium-shade w-full h-12 text-white text-base"
                    style={{ backgroundColor: accent }}
                    onClick={save}
                    disabled={uploading}
                  >
                    <Save className="h-5 w-5 mr-2" /> Save &amp; send
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="lv-premium-shade flex-1 h-11"
                      onClick={retake}
                      disabled={uploading}
                    >
                      <RotateCcw className="h-4 w-4 mr-1" /> Retake
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="lv-premium-shade flex-1 h-11 text-red-600 border-red-200"
                      onClick={cancel}
                      disabled={uploading}
                    >
                      <Trash2 className="h-4 w-4 mr-1" /> Delete
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {phase === 'saving' && (
              <div className="text-center py-4">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" style={{ color: accent }} />
                <p className="text-sm">Uploading… {progress}%</p>
              </div>
            )}
          </Card>
        )}

        {theme.showBranding && phase !== 'saved' && <GalleryFooterLogo className="mt-4" />}
      </div>
    </div>
  );
};

export default GuestVideoGuestbook;
