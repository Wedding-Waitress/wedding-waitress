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
import publicUploadStyles from '@/pages/guestMediaUpload.module.css';

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
  token, theme, accent: _accent, refreshKey: _refreshKey = 0, voiceEnabled = true, textEnabled = true,
}) => {
  const [name, setName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  // Per-section save state
  const [savingText, setSavingText] = useState(false);
  const [savedTextId, setSavedTextId] = useState<string | null>(null);
  const [savedTextDeleteToken, setSavedTextDeleteToken] = useState<string | null>(null);
  const [savedTextValue, setSavedTextValue] = useState('');

  const [savingKind, setSavingKind] = useState<'audio' | 'video' | null>(null);
  const [savedAudioId, setSavedAudioId] = useState<string | null>(null);
  const [savedVideoId, setSavedVideoId] = useState<string | null>(null);
  const [savedAudioDeleteToken, setSavedAudioDeleteToken] = useState<string | null>(null);
  const [savedVideoDeleteToken, setSavedVideoDeleteToken] = useState<string | null>(null);
  const [removingKind, setRemovingKind] = useState<'text' | 'audio' | 'video' | null>(null);

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

  const requireName = () => {
    if (name.trim()) return true;
    setFormError('Please add your full name first.');
    return false;
  };

  const thanks = 'Thank you — your message has been added to the guestbook. You can add another message type below.';

  // ---- Text ----
  const textDirty = message.trim().length > 0 && message.trim() !== savedTextValue;
  const showTextActions = textEnabled && (message.trim().length > 0 || !!savedTextId);

  const saveText = async () => {
    if (savingText) return;
    setFormError(null);
    const value = message.trim();
    if (!value) { setFormError('Please write a message first.'); return; }
    if (!requireName()) return;
    setSavingText(true);
    try {
      if (savedTextId) {
        if (!savedTextDeleteToken) throw new Error('This message can no longer be edited from this session.');
        const { error: err } = await (supabase as any).rpc('update_event_guestbook_text', {
          _token: token, _id: savedTextId, _delete_token: savedTextDeleteToken,
          _uploader_name: name.trim(), _message: value,
        });
        if (err) throw err;
      } else {
        const { data, error: err } = await (supabase as any).rpc('submit_event_guestbook_text', {
          _token: token, _uploader_name: name.trim(), _message: value,
        });
        if (err) throw err;
        const row = Array.isArray(data) ? data[0] : data;
        setSavedTextId(row?.id ?? null);
        setSavedTextDeleteToken(row?.delete_token ?? null);
      }
      setSavedTextValue(value);
      setDone(thanks);
    } catch (e: any) {
      setFormError(e?.message || 'Could not save your message. Please try again.');
    } finally {
      setSavingText(false);
    }
  };

  const removeText = async () => {
    setFormError(null);
    if (!savedTextId) { setMessage(''); return; }
    if (!savedTextDeleteToken) { setFormError('This message can no longer be removed from this session.'); return; }
    setRemovingKind('text');
    try {
      const { error: err } = await (supabase as any).rpc('delete_event_guestbook_text', {
        _token: token, _id: savedTextId, _delete_token: savedTextDeleteToken,
      });
      if (err) throw err;
      setSavedTextId(null);
      setSavedTextDeleteToken(null);
      setSavedTextValue('');
      setMessage('');
      setDone(null);
    } catch (e: any) {
      setFormError(e?.message || 'Could not remove your message. Please try again.');
    } finally {
      setRemovingKind(null);
    }
  };

  // ---- Recordings ----
  const saveRecording = async (kind: 'audio' | 'video') => {
    if (savingKind) return;
    const rec = kind === 'audio' ? audio : video;
    if (!rec.blob) return;
    setFormError(null);
    if (!requireName()) return;
    setSavingKind(kind);
    const mime = normalizeMime(rec.mime || rec.blob.type || (kind === 'audio' ? 'audio/webm' : 'video/webm'));
    const uploadResult = await upload(rec.blob, {
      token, kind, mime,
      durationSec: Math.min(MAX_SECONDS, Math.max(1, rec.seconds || 1)),
      uploaderName: name.trim(), message: '',
      filename: `guestbook-${kind}-${Date.now()}.${extFor(mime)}`,
    });
    setSavingKind(null);
    if (!uploadResult) {
      setFormError(`Could not save your ${kind} message. Your recording is still here — please try again.`);
      return;
    }
    if (kind === 'audio') {
      setSavedAudioId(uploadResult.itemId);
      setSavedAudioDeleteToken(uploadResult.deleteToken);
    } else {
      setSavedVideoId(uploadResult.itemId);
      setSavedVideoDeleteToken(uploadResult.deleteToken);
    }
    setDone(thanks);
  };

  const deleteSavedRecording = async (kind: 'audio' | 'video'): Promise<boolean> => {
    const id = kind === 'audio' ? savedAudioId : savedVideoId;
    const deleteToken = kind === 'audio' ? savedAudioDeleteToken : savedVideoDeleteToken;
    if (!id) return true;
    if (!deleteToken) {
      setFormError(`This ${kind} message can no longer be removed from this session.`);
      return false;
    }
    try {
      const { error: err } = await supabase.functions.invoke('delete-guestbook-submission', {
        body: { galleryToken: token, itemId: id, deleteToken },
      });
      if (err) throw err;
      if (kind === 'audio') {
        setSavedAudioId(null);
        setSavedAudioDeleteToken(null);
      } else {
        setSavedVideoId(null);
        setSavedVideoDeleteToken(null);
      }
      return true;
    } catch (e: any) {
      setFormError(e?.message || `Could not remove your ${kind} message. Please try again.`);
      return false;
    }
  };

  const removeRecording = async (kind: 'audio' | 'video') => {
    setFormError(null);
    setRemovingKind(kind);
    const ok = await deleteSavedRecording(kind);
    setRemovingKind(null);
    if (!ok) return;
    (kind === 'audio' ? audio : video).discard();
    setDone(null);
  };

  const recordAgain = async (kind: 'audio' | 'video') => {
    setFormError(null);
    setRemovingKind(kind);
    const ok = await deleteSavedRecording(kind);
    setRemovingKind(null);
    if (!ok) return;
    const rec = kind === 'audio' ? audio : video;
    rec.discard();
    setDone(null);
    await rec.start();
  };

  const savedBadge = (
    <div className={`flex items-center gap-2 text-sm font-semibold ${publicUploadStyles.guestbookSaved}`}>
      <CheckCircle2 className="h-4 w-4 shrink-0" /> Saved
    </div>
  );


  const cardClass = `rounded-2xl border-2 border-[#967A59] p-4 sm:p-6 ${theme.surfaceClass}`;
  const optionClass = `rounded-xl border-2 p-3 sm:p-4 space-y-3 min-w-0 ${publicUploadStyles.innerPanel} ${publicUploadStyles.guestbookOption}`;
  const badge = (letter: string) => (
    <span
      className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${publicUploadStyles.guestbookBadge}`}
    >{letter}</span>
  );

  const timer = (secs: number, recording: boolean) => (
    <div className={`flex items-center justify-center gap-2 text-sm ${publicUploadStyles.guestbookTimer}`}>
      {recording && <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse motion-reduce:animate-none" />}
      <span className="font-medium tabular-nums">
        {String(secs).padStart(2, '0')}s / {MAX_SECONDS}s
      </span>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className={`${cardClass} ${publicUploadStyles.uploadPanel} ${publicUploadStyles.guestbookPanel} space-y-6 overflow-hidden min-w-0`}>
        <div className="text-center">
          <h2 className={`text-xl font-bold ${publicUploadStyles.sectionHeading}`}>Sign the Guestbook</h2>
          <p className={`text-sm mt-1 ${publicUploadStyles.secondaryText}`}>
            Leave a written, audio or video message—or any combination.
          </p>
        </div>

        <div>
          <Label htmlFor="gb-name" className={`text-base font-semibold ${publicUploadStyles.sectionHeading}`}>
            Your full name <span className={publicUploadStyles.requiredMark}>*</span>
          </Label>
          <Input
            id="gb-name"
            className={`h-12 text-base mt-2 border-2 ${publicUploadStyles.field}`}
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Enter your full name"
            maxLength={100}
          />
        </div>

        {/* Option A — written message */}
        {textEnabled && (
          <div className={optionClass} style={{ borderColor: "#967A59" }}>
            <div className="flex items-center gap-2">
              {badge('A')}
              <h3 className={`text-base font-semibold ${publicUploadStyles.sectionHeading}`}>Leave a Digital Guestbook Message</h3>
            </div>
            <Textarea
              id="gb-text"
              className={`min-h-[110px] text-base border-2 ${publicUploadStyles.field} ${publicUploadStyles.guestbookTextarea}`}
              value={message}
              onChange={e => setMessage(e.target.value)}
              maxLength={2000}
              placeholder="Write your message for the couple…"
            />
            <p className={`text-xs ${publicUploadStyles.secondaryText}`}>{message.trim().length}/2000</p>
            {savedTextId && !textDirty && savedBadge}
            {showTextActions && (
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  type="button"
                  className={`ww-emboss-green ww-emboss-green-no-drop h-11 flex-1 text-base ${publicUploadStyles.primaryAction}`}
                  disabled={savingText || removingKind === 'text' || (!!savedTextId && !textDirty)}
                  onClick={saveText}
                >
                  {savingText
                    ? <><Loader2 className="h-4 w-4 mr-2 animate-spin motion-reduce:animate-none" /> Saving…</>
                    : (savedTextId && !textDirty)
                      ? <><CheckCircle2 className="h-4 w-4 mr-2" /> Saved</>
                      : 'Save'}
                </Button>
                <Button
                  type="button"
                  className={`ww-emboss-red h-11 flex-1 text-base text-white ${publicUploadStyles.guestbookDangerAction}`}
                  disabled={savingText || removingKind === 'text'}
                  onClick={removeText}
                >
                  {removingKind === 'text'
                    ? <><Loader2 className="h-4 w-4 mr-2 animate-spin motion-reduce:animate-none" /> Removing…</>
                    : <><Trash2 className="h-4 w-4 mr-2" /> Remove</>}
                </Button>
              </div>
            )}

          </div>
        )}

        {/* Option B — audio message */}
        {voiceEnabled && (
          <div className={optionClass} style={{ borderColor: "#967A59" }}>
            <div className="flex items-center gap-2">
              {badge('B')}
              <h3 className={`text-base font-semibold ${publicUploadStyles.sectionHeading}`}>Leave an Audio Guestbook Message</h3>
            </div>
            <p className={`text-xs ${publicUploadStyles.secondaryText}`}>Record an audio message of up to 60 seconds.</p>

            {audio.phase === 'idle' && (
              <Button
                type="button"
                className={`ww-emboss-green ww-emboss-green-no-drop w-full h-12 text-base ${publicUploadStyles.primaryAction}`}
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
                    <Button type="button" className={`ww-emboss-green flex-1 h-12 text-base ${publicUploadStyles.primaryAction}`} onClick={audio.record}>
                      <Mic className="h-5 w-5 mr-2 text-white" /> Start recording
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      className={`flex-1 h-12 text-base text-white bg-red-600 rounded-full ${publicUploadStyles.guestbookDangerAction}`}
                      onClick={audio.stop}
                    >
                      <Square className="h-5 w-5 mr-2" fill="currentColor" /> Stop
                    </Button>
                  )}
                  <Button type="button" variant="outline" className={`h-12 sm:w-auto w-full ${publicUploadStyles.secondaryAction}`} onClick={audio.discard}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {audio.phase === 'review' && audio.url && (
              <div className="space-y-3">
                <audio src={audio.url} controls className={`w-full max-w-full ${publicUploadStyles.guestbookAudio}`} />
                {savedAudioId && savedBadge}
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    type="button"
                    className={`ww-emboss-green ww-emboss-green-no-drop h-11 flex-1 text-base ${publicUploadStyles.primaryAction}`}
                    disabled={savingKind === 'audio' || removingKind === 'audio' || !!savedAudioId}
                    onClick={() => saveRecording('audio')}
                  >
                    {savingKind === 'audio'
                      ? <><Loader2 className="h-4 w-4 mr-2 animate-spin motion-reduce:animate-none" /> Saving{uploading ? ` ${progress}%` : ''}…</>
                      : savedAudioId ? <><CheckCircle2 className="h-4 w-4 mr-2" /> Saved</> : 'Save'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className={`h-11 flex-1 ${publicUploadStyles.secondaryAction}`}
                    disabled={savingKind === 'audio' || removingKind === 'audio'}
                    onClick={() => recordAgain('audio')}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" /> Record again
                  </Button>
                  <Button
                    type="button"
                    className={`ww-emboss-red h-11 flex-1 text-base text-white ${publicUploadStyles.guestbookDangerAction}`}
                    disabled={savingKind === 'audio' || removingKind === 'audio'}
                    onClick={() => removeRecording('audio')}
                  >
                    {removingKind === 'audio'
                      ? <><Loader2 className="h-4 w-4 mr-2 animate-spin motion-reduce:animate-none" /> Removing…</>
                      : <><Trash2 className="h-4 w-4 mr-2" /> Remove</>}
                  </Button>
                </div>
              </div>
            )}

          </div>
        )}

        {/* Option C — video message */}
        {voiceEnabled && (
          <div className={optionClass} style={{ borderColor: "#967A59" }}>
            <div className="flex items-center gap-2">
              {badge('C')}
              <h3 className={`text-base font-semibold ${publicUploadStyles.sectionHeading}`}>Leave a Video Guestbook Message</h3>
            </div>
            <p className={`text-xs ${publicUploadStyles.secondaryText}`}>Record a video message of up to 60 seconds.</p>

            {video.phase === 'idle' && (
              <Button
                type="button"
                className={`ww-emboss-green ww-emboss-green-no-drop w-full h-12 text-base ${publicUploadStyles.primaryAction}`}
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
                  className={`w-full max-w-full aspect-video rounded-lg bg-black object-cover ${publicUploadStyles.guestbookMediaPreview}`}
                />
                {timer(video.seconds, video.phase === 'recording')}
                <div className="flex flex-col sm:flex-row gap-2">
                  {video.phase === 'preview' ? (
                    <Button type="button" className={`ww-emboss-green flex-1 h-12 text-base ${publicUploadStyles.primaryAction}`} onClick={video.record}>
                      <VideoIcon className="h-5 w-5 mr-2 text-white" /> Start recording
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      className={`flex-1 h-12 text-base text-white bg-red-600 rounded-full ${publicUploadStyles.guestbookDangerAction}`}
                      onClick={video.stop}
                    >
                      <Square className="h-5 w-5 mr-2" fill="currentColor" /> Stop
                    </Button>
                  )}
                  <Button type="button" variant="outline" className={`h-12 sm:w-auto w-full ${publicUploadStyles.secondaryAction}`} onClick={video.discard}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {video.phase === 'review' && video.url && (
              <div className="space-y-3">
                <video src={video.url} controls playsInline className={`w-full max-w-full aspect-video rounded-lg bg-black ${publicUploadStyles.guestbookMediaPreview}`} />
                {savedVideoId && savedBadge}
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    type="button"
                    className={`ww-emboss-green ww-emboss-green-no-drop h-11 flex-1 text-base ${publicUploadStyles.primaryAction}`}
                    disabled={savingKind === 'video' || removingKind === 'video' || !!savedVideoId}
                    onClick={() => saveRecording('video')}
                  >
                    {savingKind === 'video'
                      ? <><Loader2 className="h-4 w-4 mr-2 animate-spin motion-reduce:animate-none" /> Saving{uploading ? ` ${progress}%` : ''}…</>
                      : savedVideoId ? <><CheckCircle2 className="h-4 w-4 mr-2" /> Saved</> : 'Save'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className={`h-11 flex-1 ${publicUploadStyles.secondaryAction}`}
                    disabled={savingKind === 'video' || removingKind === 'video'}
                    onClick={() => recordAgain('video')}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" /> Record again
                  </Button>
                  <Button
                    type="button"
                    className={`ww-emboss-red h-11 flex-1 text-base text-white ${publicUploadStyles.guestbookDangerAction}`}
                    disabled={savingKind === 'video' || removingKind === 'video'}
                    onClick={() => removeRecording('video')}
                  >
                    {removingKind === 'video'
                      ? <><Loader2 className="h-4 w-4 mr-2 animate-spin motion-reduce:animate-none" /> Removing…</>
                      : <><Trash2 className="h-4 w-4 mr-2" /> Remove</>}
                  </Button>
                </div>
              </div>
            )}

          </div>
        )}

        {formError && (
          <div className={`rounded-md border text-sm p-3 flex items-start gap-2 ${publicUploadStyles.guestbookError}`} role="alert">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /> <span className="break-words">{formError}</span>
          </div>
        )}
        {done && (
          <div className={`rounded-md border text-sm p-3 flex items-start gap-2 ${publicUploadStyles.guestbookSuccess}`} role="status">
            <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" /> <span>{done}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default GuestGuestbookTab;
