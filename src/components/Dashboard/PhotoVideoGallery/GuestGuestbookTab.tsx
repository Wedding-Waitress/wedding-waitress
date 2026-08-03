// Guest-facing unified Guestbook tab — shown on /gallery/:token?tab=guestbook
// Option A: written message. Option B: audio message (max 60s). Option C: video message (max 60s).
// All three are PRIVATE guestbook content (never public gallery media).
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Loader2, AlertCircle, Mic, Video as VideoIcon, Square, RotateCcw, Trash2, CheckCircle2,
} from 'lucide-react';
import type { GalleryTheme } from '@/lib/galleryTheme';
import { useGuestbookUpload } from '@/hooks/useGuestbookUpload';

interface Props {
  token: string;
  theme: GalleryTheme;
  accent: string;
  /** Bumped by the parent after a successful upload to force an immediate refresh. */
  refreshKey?: number;
  /** Audio Guestbook (audio + video recordings) enabled by the host. */
  voiceEnabled?: boolean;
  /** Digital Guestbook (written messages) enabled by the host. */
  textEnabled?: boolean;
}

const MAX_SECONDS = 60;

function pickMime(kind: 'audio' | 'video'): string {
  const cands = kind === 'audio'
    ? ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg']
    : ['video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'];
  for (const c of cands) {
    try { if ((window as any).MediaRecorder?.isTypeSupported?.(c)) return c; } catch { /* noop */ }
  }
  return kind === 'audio' ? 'audio/webm' : 'video/webm';
}
const normalizeMime = (m: string) => (m || '').split(';')[0].trim();
function extFor(mime: string): string {
  switch (normalizeMime(mime)) {
    case 'audio/mp4': return 'm4a';
    case 'audio/ogg': return 'ogg';
    case 'video/mp4': return 'mp4';
    case 'video/quicktime': return 'mov';
    case 'video/webm': return 'webm';
    default: return mime.startsWith('video') ? 'webm' : 'webm';
  }
}

type Phase = 'idle' | 'preview' | 'recording' | 'review';

/** Encapsulated recorder state for one kind (audio or video). */
function useRecorder(kind: 'audio' | 'video', onError: (m: string) => void) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [seconds, setSeconds] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [mime, setMime] = useState('');
  const [stream, setStream] = useState<MediaStream | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<number | null>(null);
  const startRef = useRef(0);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setStream(null);
  }, []);

  useEffect(() => () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      try { recorderRef.current.stop(); } catch { /* noop */ }
    }
    streamRef.current?.getTracks().forEach(t => t.stop());
  }, []);

  const start = async () => {
    try {
      const constraints: MediaStreamConstraints = kind === 'audio'
        ? { audio: true, video: false }
        : { audio: true, video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } };
      const s = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = s;
      setStream(s);
      setSeconds(0);
      setPhase('preview');
    } catch (e: any) {
      onError(e?.name === 'NotAllowedError'
        ? `Permission denied. Please allow ${kind === 'audio' ? 'microphone' : 'camera and microphone'} access.`
        : (e?.message || 'Could not access your device'));
    }
  };

  const stop = useCallback(() => {
    if (timerRef.current) { window.clearInterval(timerRef.current); timerRef.current = null; }
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      try { recorderRef.current.stop(); } catch { /* noop */ }
    }
  }, []);

  const record = () => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    const mt = pickMime(kind);
    let mr: MediaRecorder;
    try { mr = new MediaRecorder(streamRef.current, { mimeType: mt }); }
    catch { mr = new MediaRecorder(streamRef.current); }
    setMime(mr.mimeType || mt);
    mr.ondataavailable = ev => { if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data); };
    mr.onstop = () => {
      const finalMime = normalizeMime(mr.mimeType || mt);
      const b = new Blob(chunksRef.current, { type: finalMime });
      setBlob(b);
      setUrl(URL.createObjectURL(b));
      setMime(finalMime);
      setPhase('review');
      stopStream();
    };
    recorderRef.current = mr;
    startRef.current = Date.now();
    mr.start(250);
    setPhase('recording');
    setSeconds(0);
    timerRef.current = window.setInterval(() => {
      const s = Math.floor((Date.now() - startRef.current) / 1000);
      setSeconds(s);
      if (s >= MAX_SECONDS) stop();
    }, 200);
  };

  const discard = useCallback(() => {
    setUrl(prev => { if (prev) URL.revokeObjectURL(prev); return null; });
    setBlob(null);
    setSeconds(0);
    setPhase('idle');
    stopStream();
  }, [stopStream]);

  return { phase, seconds, blob, url, mime, stream, start, record, stop, discard };
}

export const GuestGuestbookTab: React.FC<Props> = ({
  token, theme, accent, refreshKey: _refreshKey = 0, voiceEnabled = true, textEnabled = true,
}) => {
  const [name, setName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [savingText, setSavingText] = useState(false);

  const audio = useRecorder('audio', setFormError);
  const video = useRecorder('video', setFormError);
  const { upload, uploading, progress } = useGuestbookUpload();

  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    const el = videoPreviewRef.current;
    if (el && video.stream) {
      el.srcObject = video.stream;
      el.play().catch(() => { /* noop */ });
    }
  }, [video.stream]);

  const nameKey = token ? `gallery-uploader-name:${token}` : '';
  useEffect(() => {
    if (!nameKey) return;
    try {
      const saved = sessionStorage.getItem(nameKey);
      if (saved) setName(saved);
    } catch { /* noop */ }
  }, [nameKey]);
  useEffect(() => {
    if (!nameKey) return;
    try { if (name.trim()) sessionStorage.setItem(nameKey, name.trim()); } catch { /* noop */ }
  }, [name, nameKey]);

  const hasText = textEnabled && message.trim().length > 0;
  const hasAudio = voiceEnabled && !!audio.blob;
  const hasVideo = voiceEnabled && !!video.blob;
  const busy = savingText || uploading;

  const submit = async () => {
    setFormError(null);
    setDone(null);
    if (!hasText && !hasAudio && !hasVideo) {
      setFormError('Please write a message or record an audio or video message first.');
      return;
    }
    if (!name.trim()) {
      setFormError('Please add your full name first.');
      return;
    }

    let ok = true;

    if (hasText) {
      setSavingText(true);
      const { error: err } = await (supabase as any).rpc('submit_event_guestbook_text', {
        _token: token,
        _uploader_name: name.trim(),
        _message: message.trim(),
      });
      setSavingText(false);
      if (err) { ok = false; setFormError(err.message || 'Could not save your message'); }
    }

    if (hasAudio && audio.blob) {
      const mime = normalizeMime(audio.mime || audio.blob.type || 'audio/webm');
      const good = await upload(audio.blob, {
        token, kind: 'audio', mime,
        durationSec: Math.min(MAX_SECONDS, Math.max(1, audio.seconds || 1)),
        uploaderName: name.trim(), message: '',
        filename: `guestbook-audio-${Date.now()}.${extFor(mime)}`,
      });
      if (!good) { ok = false; setFormError('Could not upload your audio message. Please try again.'); }
    }

    if (hasVideo && video.blob) {
      const mime = normalizeMime(video.mime || video.blob.type || 'video/webm');
      const good = await upload(video.blob, {
        token, kind: 'video', mime,
        durationSec: Math.min(MAX_SECONDS, Math.max(1, video.seconds || 1)),
        uploaderName: name.trim(), message: '',
        filename: `guestbook-video-${Date.now()}.${extFor(mime)}`,
      });
      if (!good) { ok = false; setFormError('Could not upload your video message. Please try again.'); }
    }

    if (ok) {
      setDone('Thank you — your message has been added to the guestbook.');
      setMessage('');
      audio.discard();
      video.discard();
    }
  };

  const cardClass = `rounded-2xl border p-4 sm:p-6 ${theme.surfaceClass}`;
  const optionClass = 'rounded-xl border p-3 sm:p-4 space-y-3';
  const badge = (letter: string) => (
    <span
      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
      style={{ backgroundColor: accent }}
    >{letter}</span>
  );

  const timer = (secs: number, recording: boolean) => (
    <div className="flex items-center justify-center gap-2 text-sm">
      {recording && <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />}
      <span className={`font-medium tabular-nums ${theme.textClass}`}>
        {String(secs).padStart(2, '0')}s / {MAX_SECONDS}s
      </span>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className={`${cardClass} space-y-6 overflow-hidden`}>
        <div className="text-center">
          <h2 className="text-xl font-bold text-black">Sign the Guestbook</h2>
          <p className="text-sm mt-1 text-black">
            Leave a written, audio or video message—or any combination.
          </p>
        </div>

        <div>
          <Label htmlFor="gb-name" className="text-base font-semibold text-black">
            Your full name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="gb-name"
            className="h-12 text-base mt-2 bg-white text-[#1D1D1F] placeholder:text-[#6E6E73] border-neutral-300"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Enter your full name"
            maxLength={100}
          />
        </div>

        {/* Option A — written message */}
        {textEnabled && (
          <div className={optionClass} style={{ borderColor: `${accent}55` }}>
            <div className="flex items-center gap-2">
              {badge('A')}
              <h3 className="text-base font-semibold text-black">Leave a Digital Guestbook Message</h3>
            </div>
            <Textarea
              id="gb-text"
              className="min-h-[110px] text-base bg-white text-[#1D1D1F] placeholder:text-[#6E6E73] border-neutral-300"
              value={message}
              onChange={e => setMessage(e.target.value)}
              maxLength={2000}
              placeholder="Write your message for the couple…"
            />
            <p className={`text-xs ${theme.mutedClass}`}>{message.trim().length}/2000</p>
          </div>
        )}

        {/* Option B — audio message */}
        {voiceEnabled && (
          <div className={optionClass} style={{ borderColor: `${accent}55` }}>
            <div className="flex items-center gap-2">
              {badge('B')}
              <h3 className="text-base font-semibold text-black">Leave an Audio Guestbook Message</h3>
            </div>
            <p className="text-xs text-black">Record an audio message of up to 60 seconds.</p>

            {audio.phase === 'idle' && (
              <Button
                type="button"
                className="ww-emboss-green ww-emboss-green-no-drop w-full h-12 text-base"
                onClick={audio.start}
              >
                <Mic className="h-5 w-5 mr-2 text-white" /> Start Audio Message
              </Button>
            )}

            {(audio.phase === 'preview' || audio.phase === 'recording') && (
              <div className="space-y-3">
                {timer(audio.seconds, audio.phase === 'recording')}
                <div className="flex flex-col sm:flex-row gap-2">
                  {audio.phase === 'preview' ? (
                    <Button type="button" className="ww-emboss-green flex-1 h-12 text-base" onClick={audio.record}>
                      <Mic className="h-5 w-5 mr-2 text-white" /> Start recording
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      className="flex-1 h-12 text-base text-white bg-red-600 hover:bg-red-700 rounded-full"
                      onClick={audio.stop}
                    >
                      <Square className="h-5 w-5 mr-2" fill="currentColor" /> Stop
                    </Button>
                  )}
                  <Button type="button" variant="outline" className="h-12 sm:w-auto w-full" onClick={audio.discard}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {audio.phase === 'review' && audio.url && (
              <div className="space-y-3">
                <audio src={audio.url} controls className="w-full" />
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button type="button" variant="outline" className="h-11 flex-1" onClick={() => { audio.discard(); audio.start(); }}>
                    <RotateCcw className="h-4 w-4 mr-2" /> Record again
                  </Button>
                  <Button type="button" variant="outline" className="h-11 flex-1 text-red-600" onClick={audio.discard}>
                    <Trash2 className="h-4 w-4 mr-2" /> Remove
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Option C — video message */}
        {voiceEnabled && (
          <div className={optionClass} style={{ borderColor: `${accent}55` }}>
            <div className="flex items-center gap-2">
              {badge('C')}
              <h3 className="text-base font-semibold text-black">Leave a Video Guestbook Message</h3>
            </div>
            <p className="text-xs text-black">Record a video message of up to 60 seconds.</p>

            {video.phase === 'idle' && (
              <Button
                type="button"
                className="ww-emboss-green ww-emboss-green-no-drop w-full h-12 text-base"
                onClick={video.start}
              >
                <VideoIcon className="h-5 w-5 mr-2 text-white" /> Start Video Message
              </Button>
            )}

            {(video.phase === 'preview' || video.phase === 'recording') && (
              <div className="space-y-3">
                <video
                  ref={videoPreviewRef}
                  muted
                  playsInline
                  className="w-full aspect-video rounded-lg bg-black object-cover"
                />
                {timer(video.seconds, video.phase === 'recording')}
                <div className="flex flex-col sm:flex-row gap-2">
                  {video.phase === 'preview' ? (
                    <Button type="button" className="ww-emboss-green flex-1 h-12 text-base" onClick={video.record}>
                      <VideoIcon className="h-5 w-5 mr-2 text-white" /> Start recording
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      className="flex-1 h-12 text-base text-white bg-red-600 hover:bg-red-700 rounded-full"
                      onClick={video.stop}
                    >
                      <Square className="h-5 w-5 mr-2" fill="currentColor" /> Stop
                    </Button>
                  )}
                  <Button type="button" variant="outline" className="h-12 sm:w-auto w-full" onClick={video.discard}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {video.phase === 'review' && video.url && (
              <div className="space-y-3">
                <video src={video.url} controls playsInline className="w-full aspect-video rounded-lg bg-black" />
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button type="button" variant="outline" className="h-11 flex-1" onClick={() => { video.discard(); video.start(); }}>
                    <RotateCcw className="h-4 w-4 mr-2" /> Record again
                  </Button>
                  <Button type="button" variant="outline" className="h-11 flex-1 text-red-600" onClick={video.discard}>
                    <Trash2 className="h-4 w-4 mr-2" /> Remove
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {formError && (
          <div className="rounded-md border border-red-300 bg-red-50 text-red-900 text-sm p-3 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /> <span className="break-words">{formError}</span>
          </div>
        )}
        {done && (
          <div className="rounded-md border border-green-300 bg-green-50 text-green-900 text-sm p-3 flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" /> <span>{done}</span>
          </div>
        )}

        <Button
          type="button"
          className="w-full h-12 text-base text-white lv-premium-shade"
          style={{ backgroundColor: accent }}
          disabled={busy || (!hasText && !hasAudio && !hasVideo)}
          onClick={submit}
        >
          {busy
            ? <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Sending{uploading ? ` ${progress}%` : ''}…</>
            : 'Submit to Guestbook'}
        </Button>
      </div>
    </div>
  );
};

export default GuestGuestbookTab;
