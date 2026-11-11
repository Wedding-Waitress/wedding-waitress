import { useEffect } from 'react';

/** Keep the focused QR name field visible, without scrolling to its results. */
export function useMobileGuestSearchViewport() {
  useEffect(() => {
    let frame = 0;
    let align = false;
    const selector = '[data-qr-guest-page] input[data-guest-name-search]';
    const schedule = (moveUp = false) => {
      if (!window.matchMedia('(max-width: 767px)').matches) return;
      const input = document.activeElement;
      if (!(input instanceof HTMLInputElement) || !input.matches(selector)) return;
      align ||= moveUp;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (document.activeElement !== input || !input.isConnected) return;
        const viewport = window.visualViewport;
        const top = (viewport?.offsetTop || 0) + 24;
        const bottom = (viewport?.offsetTop || 0) + (viewport?.height || window.innerHeight) - 24;
        const rect = input.getBoundingClientRect();
        let delta = align || rect.top < top ? rect.top - top : rect.bottom > bottom ? rect.bottom - bottom : 0;
        align = false;
        if (Math.abs(delta) < 2) return;
        // Scroll the actual containing pane first, then any remaining page space.
        for (let node = input.parentElement; node && Math.abs(delta) >= 2; node = node.parentElement) {
          const isPage = node === document.scrollingElement;
          if (!isPage && !/(auto|scroll)/.test(getComputedStyle(node).overflowY)) continue;
          if (node.scrollHeight <= node.clientHeight) continue;
          const before = node.scrollTop;
          const behavior = node.style.scrollBehavior;
          node.style.scrollBehavior = 'auto';
          node.scrollTop += delta;
          node.style.scrollBehavior = behavior;
          delta -= node.scrollTop - before;
        }
      });
    };
    const focus = (event: FocusEvent) => {
      if (event.target instanceof Element && event.target.matches(selector)) schedule(true);
    };
    const update = () => schedule();
    const blur = () => { cancelAnimationFrame(frame); align = false; };
    document.addEventListener('focusin', focus);
    document.addEventListener('focusout', blur);
    document.addEventListener('input', update);
    window.addEventListener('resize', update);
    window.visualViewport?.addEventListener('resize', update);
    window.visualViewport?.addEventListener('scroll', update);
    schedule(true);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('focusin', focus);
      document.removeEventListener('focusout', blur);
      document.removeEventListener('input', update);
      window.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('scroll', update);
    };
  }, []);
}
