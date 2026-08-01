// Guest-facing unified Guestbook tab — shown on /gallery/:token?tab=guestbook
// Option A: leave a written message. Option B: leave a voice message (max 60s).
// Below both options: the list of messages left by guests (approved items only).
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Loader2, MessageCircle, AlertCircle, Quote, Mic, Square, RotateCcw, CheckCircle2,
} from 'lucide-react';
import type { GalleryTheme } from '@/lib/galleryTheme';
import { useGuestbookUpload } from '@/hooks/useGuestbookUpload';

interface GuestbookRow {
  id: string;
  uploader_name: string | null;
  guestbook_message: string | null;
  uploaded_at: string | null;
}

interface Props {
  token: string;
  theme: GalleryTheme;
  accent: string;
  /** Bumped by the parent after a successful upload to force an immediate refresh. */
  refreshKey?: number;
  /** Whether the host enabled the Voice Guestbook for this event. */
  voiceEnabled?: boolean;
}

const MAX_SECONDS = 60;

function pickAudioMime(): string {
  const cands = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
  for (const c of cands) {
    try { if ((window as any).MediaRecorder?.isTypeSupported?.(c)) return c; } catch { /* noop */ }
  }
  return 'audio/webm';
}
const normalizeMime = (m: string) => (m || '').split(';')[0].trim();
function extFor(mime: string): string {
  switch (normalizeMime(mime)) {
    case 'audio/mp4': return 'm4a';
    case 'audio/ogg': return 'ogg';
    default: return 'webm';
  }
}

export const GuestGuestbookTab: React.FC<Props> = ({ token, theme, accent, refreshKey = 0, voiceEnabled = true }) => {
  const [rows, setRows] = useState<GuestbookRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  // shared
  const [name, setName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  // text option
  const [message, setMessage] = useState('');
  const [savingText, setSavingText] = useState(false);

  // voice option
  const [recPhase, setRecPhase] = useState<'idle' | 'preview' | 'recording' | 'review'>('idle');
  const [seconds, setSeconds] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [recordedMime, setRecordedMime] = useState('');
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef(0);
  const { upload, uploading, progress } = useGuestbookUpload();

  const nameKey = token ? `gallery-uploader-name:${token}` : '';

  useEffect(() => () => { mounted.current = false; }, []);

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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error: err } = await (supabase as any)
        .rpc('get_event_media_guestbook_public', { _token: token });
      if (err) throw new Error(err.message);
      if (!mounted.current) return;
      setRows((data || []) as GuestbookRow[]);
      setError(null);
    } catch (e: any) {
      if (mounted.current) setError(e?.message || 'Could not load the guestbook');
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load, refreshKey]);

  /* ---------------- voice recorder ---------------- */
  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      try { recorderRef.current.stop(); } catch { /* noop */ }
    }
    streamRef.current?.getTracks().forEach(t => t.stop());
  }, []);

  const startSession = async () => {
    setFormError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      streamRef.current = stream;
      setSeconds(0);
      setRecPhase('preview');
    } catch (e: any) {
      setFormError(e?.name === 'NotAllowedError'
        ? 'Microphone permission denied. Please allow microphone access.'
        : (e?.message || 'Could not access your microphone'));
    }
  };

  const stopRecording = useCallback(() => {
    if (timerRef.current) { window.clearInterval(timerRef.current); timerRef.current = null; }
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      try { recorderRef.current.stop(); } catch { /* noop */ }
    }
  }, []);

  const startRecording = () => {
    if (!streamRef.current) return;
    setFormError(null);
    chunksRef.current = [];
    const mimeType = pickAudioMime();
    let mr: MediaRecorder;
    try { mr = new MediaRecorder(streamRef.current, { mimeType }); }
    catch { mr = new MediaRecorder(streamRef.current); }
    setRecordedMime(mr.mimeType || mimeType);
    mr.ondataavailable = ev => { if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data); };
    mr.onstop = () => {
      const finalMime = normalizeMime(mr.mimeType || mimeType);
      const blob = new Blob(chunksRef.current, { type: finalMime });
      setRecordedBlob(blob);
      setRecordedUrl(URL.createObjectURL(blob));
      setRecordedMime(finalMime);
      setRecPhase('review');
      stopStream();
    };
    recorderRef.current = mr;
    startTimeRef.current = Date.now();
    mr.start(250);
    setRecPhase('recording');
    setSeconds(0);
    timerRef.current = window.setInterval(() => {
      const s = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setSeconds(s);
      if (s >= MAX_SECONDS) stopRecording();
    }, 200);
  };

  const discardRecording = () => {
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordedUrl(null);
    setRecordedBlob(null);
    setSeconds(0);
    setRecPhase('idle');
    stopStream();
  };

  /* ---------------- submit ---------------- */
  const hasText = message.trim().length > 0;
  const hasVoice = !!recordedBlob;
  const busy = savingText || uploading;

  const submit = async () => {
    setFormError(null);
    setDone(null);
    if (!hasText && !hasVoice) {
      setFormError('Please write a message or record a voice message first.');
      return;
    }
    if (!name.trim()) {
      setFormError('Please add your full name first.');
      return;
    }

    let okText = true;
    let okVoice = true;

    if (hasText) {
      setSavingText(true);
      const { error: err } = await (supabase as any).rpc('submit_event_guestbook_text', {
        _token: token,
        _uploader_name: name.trim(),
        _message: message.trim(),
      });
      setSavingText(false);
      if (err) { okText = false; setFormError(err.message || 'Could not save your message'); }
    }

    if (hasVoice && recordedBlob) {
      const mime = normalizeMime(recordedMime || recordedBlob.type || 'audio/webm');
      okVoice = await upload(recordedBlob, {
        token,
        kind: 'audio',
        mime,
        durationSec: Math.min(MAX_SECONDS, Math.max(1, seconds || 1)),
        uploaderName: name.trim(),
        message: '',
        filename: `guestbook-audio-${Date.now()}.${extFor(mime)}`,
      });
      if (!okVoice) setFormError('Could not upload your voice message. Please try again.');
    }

    if (okText && okVoice) {
      setDone('Thank you — your message has been added to the guestbook.');
      setMessage('');
      discardRecording();
      load();
    }
  };

  const cardClass = `rounded-2xl border p-5 sm:p-6 ${theme.surfaceClass}`;

  return (
    <div className="space-y-6">
      {/* -------- Leave a message -------- */}
      <div className={`${cardClass} space-y-6`}>
        <div className="text-center">
          <MessageCircle className="h-8 w-8 mx-auto mb-2" style={{ color: accent }} />
          <h2 className={`text-xl font-semibold ${theme.textClass}`}>Sign the Guestbook</h2>
          <p className={`text-sm mt-1 ${theme.mutedClass}`}>
            Leave a written note, a voice message, or both.
          </p>
        </div>

        <div>
          <Label htmlFor="gb-name" className={`text-base font-semibold ${theme.textClass}`}>
            Your full name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="gb-name"
            className="h-12 text-base mt-2"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Enter your full name"
            maxLength={100}
          />
        </div>

        {/* Option A — text */}
        <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: `${accent}55` }}>
          <div className="flex items-center gap-2">
            <span
              className="inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white"
              style={{ backgroundColor: accent }}
            >A</span>
            <h3 className={`text-base font-semibold ${theme.textClass}`}>Leave a Text Message</h3>
          </div>
          <Textarea
            id="gb-text"
            className="min-h-[110px] text-base"
            value={message}
            onChange={e => setMessage(e.target.value)}
            maxLength={2000}
            placeholder="Write your message for the couple…"
          />
          <p className={`text-xs ${theme.mutedClass}`}>{message.trim().length}/2000</p>
        </div>

        {/* Option B — voice */}
        {voiceEnabled && (
          <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: `${accent}55` }}>
            <div className="flex items-center gap-2">
              <span
                className="inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ backgroundColor: accent }}
              >B</span>
              <h3 className={`text-base font-semibold ${theme.textClass}`}>Leave a Voice Message</h3>
            </div>
            <p className={`text-xs ${theme.mutedClass}`}>Record up to {MAX_SECONDS} seconds.</p>

            {recPhase === 'idle' && (
              <Button
                type="button"
                variant="outline"
                className="w-full h-12 text-base lv-premium-shade"
                onClick={startSession}
              >
                <Mic className="h-5 w-5 mr-2" /> Start voice message
              </Button>
            )}

            {(recPhase === 'preview' || recPhase === 'recording') && (
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-2 text-sm">
                  {recPhase === 'recording' && <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />}
                  <span className={`font-medium tabular-nums ${theme.textClass}`}>
                    {String(seconds).padStart(2, '0')}s / {MAX_SECONDS}s
                  </span>
                </div>
                <div className="flex gap-2">
                  {recPhase === 'preview' ? (
                    <Button
                      type="button"
                      className="flex-1 h-12 text-white text-base lv-premium-shade"
                      style={{ backgroundColor: accent }}
                      onClick={startRecording}
                    >
                      <Mic className="h-5 w-5 mr-2" /> Start recording
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      className="flex-1 h-12 text-white text-base bg-red-600 hover:bg-red-700 lv-premium-shade"
                      onClick={stopRecording}
                    >
                      <Square className="h-5 w-5 mr-2" fill="currentColor" /> Stop
                    </Button>
                  )}
                  <Button type="button" variant="outline" className="h-12" onClick={discardRecording}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {recPhase === 'review' && recordedUrl && (
              <div className="space-y-3">
                <audio src={recordedUrl} controls className="w-full" />
                <Button type="button" variant="outline" className="w-full h-11" onClick={discardRecording}>
                  <RotateCcw className="h-4 w-4 mr-2" /> Record again
                </Button>
              </div>
            )}
          </div>
        )}

        {formError && (
          <div className="rounded-md border border-red-300 bg-red-50 text-red-900 text-sm p-3 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /> <span>{formError}</span>
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
          disabled={busy || (!hasText && !hasVoice)}
          onClick={submit}
        >
          {busy
            ? <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Sending{uploading ? ` ${progress}%` : ''}…</>
            : 'Submit to Guestbook'}
        </Button>
      </div>

      {/* -------- Messages -------- */}
      {loading ? (
        <div className="py-12 flex justify-center">
          <Loader2 className="h-7 w-7 animate-spin" style={{ color: accent }} />
        </div>
      ) : error ? (
        <div className={`${cardClass} text-center`}>
          <AlertCircle className="h-6 w-6 mx-auto mb-2 text-red-500" />
          <p className={`text-sm ${theme.mutedClass}`}>{error}</p>
        </div>
      ) : rows.length === 0 ? (
        <div className={`${cardClass} text-center py-10`}>
          <MessageCircle className="h-9 w-9 mx-auto mb-3" style={{ color: accent }} />
          <p className={`text-base font-medium ${theme.textClass}`}>No messages yet</p>
          <p className={`text-sm mt-1.5 ${theme.mutedClass}`}>Be the first to leave a note for the couple.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className={`text-center text-sm ${theme.mutedClass}`}>
            {rows.length} {rows.length === 1 ? 'message' : 'messages'} for the couple
          </p>
          <ul className="space-y-4">
            {rows.map(r => (
              <li
                key={r.id}
                className={`relative rounded-2xl border p-5 sm:p-6 ${theme.surfaceClass} shadow-[0_4px_20px_rgba(0,0,0,0.04)]`}
              >
                <Quote className="h-5 w-5 mb-3 opacity-70" style={{ color: accent }} />
                <p className={`text-base leading-relaxed whitespace-pre-wrap ${theme.textClass}`}>
                  {r.guestbook_message}
                </p>
                <p className={`mt-4 text-sm ${theme.mutedClass}`}>
                  — {r.uploader_name?.trim() || 'A guest'}
                  {r.uploaded_at && ` • ${new Date(r.uploaded_at).toLocaleDateString()}`}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default GuestGuestbookTab;
