import { useEffect, useRef, type RefObject } from 'react';

/** Reveal the first match once per search, without moving focus or hiding the input. */
export function useGuestSearchResultReveal(inputRef: RefObject<HTMLInputElement>, resultsRef: RefObject<HTMLDivElement>, query: string, firstResultId: string | undefined, enabled: boolean) {
  const revealed = useRef(false);
  useEffect(() => {
    if (!query.trim()) { revealed.current = false; return; }
    if (!enabled || !firstResultId || revealed.current) return;
    let timer: number;
    const cancel = () => { revealed.current = true; window.clearTimeout(timer); };
    const reveal = () => {
      const input = inputRef.current;
      const result = resultsRef.current?.querySelector<HTMLElement>('[data-guest-search-result]');
      if (!input || document.activeElement !== input || !result) return;
      revealed.current = true;
      const viewport = window.visualViewport;
      const top = (viewport?.offsetTop ?? 0) + 12;
      const bottom = (viewport?.offsetTop ?? 0) + (viewport?.height ?? window.innerHeight) - 12;
      // Leave the focused field/caret visible, including above a mobile keyboard.
      const delta = Math.min(Math.max(0, result.getBoundingClientRect().bottom - bottom), Math.max(0, input.getBoundingClientRect().top - top));
      if (delta > 1) window.scrollBy({ top: delta, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    };
    const schedule = () => { window.clearTimeout(timer); timer = window.setTimeout(reveal, 220); };
    schedule();
    window.visualViewport?.addEventListener('resize', schedule);
    window.addEventListener('wheel', cancel, { passive: true });
    window.addEventListener('touchmove', cancel, { passive: true });
    return () => {
      window.clearTimeout(timer);
      window.visualViewport?.removeEventListener('resize', schedule);
      window.removeEventListener('wheel', cancel);
      window.removeEventListener('touchmove', cancel);
    };
  }, [inputRef, resultsRef, query, firstResultId, enabled]);
}
