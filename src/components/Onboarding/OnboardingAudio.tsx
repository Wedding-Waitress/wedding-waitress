import React from 'react';
import { LoaderCircle, Pause, Play, RotateCcw, Square } from 'lucide-react';
import { GUIDED_SETUP_AUDIO } from '@/config/guidedSetupMedia';
import styles from './GuidedEventSetup.module.css';

export const OnboardingAudio = ({ step }: { step: number }) => {
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const [available, setAvailable] = React.useState(false);
  const [checking, setChecking] = React.useState(true);
  const [state, setState] = React.useState<'idle' | 'loading' | 'playing' | 'paused' | 'ended'>('idle');
  const source = GUIDED_SETUP_AUDIO[step];

  React.useEffect(() => {
    let active = true;
    setChecking(true); setAvailable(false); setState('idle');
    audioRef.current?.pause();
    audioRef.current = null;
    void fetch(source, { method: 'HEAD' }).then((response) => {
      const isAudio = response.ok && (response.headers.get('content-type') || '').startsWith('audio/');
      if (active) setAvailable(isAudio);
    }).catch(() => undefined).finally(() => { if (active) setChecking(false); });
    return () => { active = false; audioRef.current?.pause(); audioRef.current = null; };
  }, [source]);

  const ensureAudio = () => {
    if (audioRef.current) return audioRef.current;
    const audio = new Audio(source);
    audio.preload = 'metadata';
    audio.addEventListener('playing', () => setState('playing'));
    audio.addEventListener('pause', () => setState((current) => current === 'ended' || current === 'idle' ? current : 'paused'));
    audio.addEventListener('ended', () => setState('ended'));
    audio.addEventListener('waiting', () => setState('loading'));
    audio.addEventListener('error', () => { setAvailable(false); setState('idle'); });
    audioRef.current = audio;
    return audio;
  };

  const toggle = async () => {
    const audio = ensureAudio();
    if (state === 'playing') { audio.pause(); return; }
    if (state === 'ended') audio.currentTime = 0;
    setState('loading');
    try { await audio.play(); } catch { setAvailable(false); setState('idle'); }
  };
  const stop = () => { const audio = audioRef.current; if (!audio) return; audio.pause(); audio.currentTime = 0; setState('idle'); };

  return <div className={styles.audio} aria-live="polite">
    <button type="button" onClick={() => void toggle()} disabled={!available || checking} aria-label="Listen to Wedding Waitress" aria-pressed={state === 'playing'}>
      {checking || state === 'loading' ? <LoaderCircle className={styles.spin} aria-hidden /> : state === 'playing' ? <Pause aria-hidden /> : state === 'ended' ? <RotateCcw aria-hidden /> : <Play aria-hidden />}
      <span>Listen to Wedding Waitress</span>
    </button>
    {available && state !== 'idle' && <button type="button" className={styles.audioStop} onClick={stop} aria-label="Stop Wedding Waitress audio"><Square aria-hidden />Stop</button>}
    {!checking && !available && <span className={styles.audioUnavailable}>Narration coming soon. All instructions are shown below.</span>}
  </div>;
};
