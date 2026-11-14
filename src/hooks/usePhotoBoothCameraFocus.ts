import { useCallback, useEffect, useRef, type RefObject } from 'react';

/** A single, cancellable page scroll after the mobile keyboard finishes closing. */
export function usePhotoBoothCameraFocus(cameraRef: RefObject<HTMLElement>) {
  const pending = useRef<(() => void) | null>(null);
  const cancel = useCallback(() => { pending.current?.(); pending.current = null; }, []);
  useEffect(() => cancel, [cancel]);

  return useCallback(() => {
    cancel();
    // Include tablets and narrow phones; leave ordinary desktop editing alone.
    if (window.innerWidth > 767 && (navigator.maxTouchPoints || 0) === 0 && !window.matchMedia('(pointer: coarse)').matches) return;
    const viewport = window.visualViewport;
    const started = Date.now();
    let settleTimer: ReturnType<typeof setTimeout>;
    let deadlineTimer: ReturnType<typeof setTimeout>;
    const cleanup = () => {
      clearTimeout(settleTimer);
      clearTimeout(deadlineTimer);
      viewport?.removeEventListener('resize', settle);
      viewport?.removeEventListener('scroll', settle);
      window.removeEventListener('touchmove', cancel);
      window.removeEventListener('wheel', cancel);
      window.removeEventListener('pointerdown', cancel);
      window.removeEventListener('focusin', cancel);
    };
    const position = () => {
      cleanup();
      pending.current = null;
      const camera = cameraRef.current;
      if (!camera?.isConnected) return;
      const rect = camera.getBoundingClientRect();
      const visibleHeight = viewport?.height || window.innerHeight;
      const visibleTop = viewport?.offsetTop || 0;
      // The embedded guest page can scroll BODY independently of window.scrollY.
      let scroller = camera.parentElement;
      while (scroller) {
        if (/(auto|scroll)/.test(getComputedStyle(scroller).overflowY) && scroller.scrollHeight > scroller.clientHeight + 1) break;
        scroller = scroller.parentElement;
      }
      const nested = scroller && scroller !== document.scrollingElement ? scroller : null;
      const bounds = nested?.getBoundingClientRect();
      const top = bounds ? Math.max(visibleTop, bounds.top) : visibleTop;
      const bottom = bounds ? Math.min(visibleTop + visibleHeight, bounds.bottom) : visibleTop + visibleHeight;
      const delta = rect.top + rect.height / 2 - (top + (bottom - top) / 2);
      if (Math.abs(delta) < 2) return;
      const scrollOptions: ScrollToOptions = {
        top: Math.max(0, (nested ? nested.scrollTop : window.scrollY) + delta),
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
      };
      if (nested) nested.scrollTo(scrollOptions);
      else window.scrollTo(scrollOptions);
    };
    function settle() {
      clearTimeout(settleTimer);
      // Wait at least 350ms after blur, then 200ms after the last viewport change.
      settleTimer = setTimeout(position, Math.max(200, 350 - (Date.now() - started)));
    }
    pending.current = cleanup;
    viewport?.addEventListener('resize', settle);
    viewport?.addEventListener('scroll', settle);
    window.addEventListener('touchmove', cancel, { passive: true });
    window.addEventListener('wheel', cancel, { passive: true });
    window.addEventListener('pointerdown', cancel, { passive: true });
    window.addEventListener('focusin', cancel);
    settleTimer = setTimeout(position, 350);
    // Some iOS versions emit repeated viewport events during keyboard dismissal.
    deadlineTimer = setTimeout(position, 1200);
  }, [cameraRef, cancel]);
}
