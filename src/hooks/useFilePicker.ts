import { useCallback, useEffect, useRef, useState } from 'react';

/** Picker lifecycle only: never clears files, validation, or upload state. */
export function useFilePicker() {
  const [awaitingPicker, setAwaitingPicker] = useState(false);
  const cleanup = useRef<(() => void) | null>(null);
  const finishPicker = useCallback(() => {
    cleanup.current?.();
    cleanup.current = null;
    setAwaitingPicker(false);
  }, []);

  useEffect(() => () => cleanup.current?.(), []);

  const openPicker = useCallback((input: HTMLInputElement | null) => {
    finishPicker();
    if (!input) return;
    setAwaitingPicker(true);
    let returnTimer: number | undefined;
    // Some mobile pickers emit neither cancel/change nor a focus transition.
    // This bounds the cosmetic waiting state; a later change still processes
    // normally. Hidden pages wait for a return signal instead.
    const fallback = window.setTimeout(() => {
      if (document.visibilityState !== 'hidden') finishPicker();
    }, 2000);
    const returned = () => {
      if (document.visibilityState === 'hidden') return;
      window.clearTimeout(returnTimer);
      returnTimer = window.setTimeout(finishPicker, 250);
    };
    const interacted = () => finishPicker();
    input.addEventListener('cancel', finishPicker);
    input.addEventListener('change', finishPicker);
    window.addEventListener('focus', returned);
    window.addEventListener('pageshow', returned);
    document.addEventListener('visibilitychange', returned);
    window.addEventListener('pointerdown', interacted, true);
    cleanup.current = () => {
      window.clearTimeout(fallback);
      window.clearTimeout(returnTimer);
      input.removeEventListener('cancel', finishPicker);
      input.removeEventListener('change', finishPicker);
      window.removeEventListener('focus', returned);
      window.removeEventListener('pageshow', returned);
      document.removeEventListener('visibilitychange', returned);
      window.removeEventListener('pointerdown', interacted, true);
    };
    try { input.click(); } catch { finishPicker(); }
  }, [finishPicker]);

  return { awaitingPicker, openPicker, finishPicker };
}
