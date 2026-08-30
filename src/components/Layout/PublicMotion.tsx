import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const REVEAL_SELECTOR = [
  'main .ww-eyebrow',
  'main .ww-display',
  'main .ww-title',
  'main .ww-lead',
  'main .ww-card',
  'main .ww-public-card',
  'main .ww-image-frame',
  'main .ww-media-card',
  'main .ww-event-hero-mark',
  'main [data-ww-motion]',
  'main .grid > article',
  'main .grid > a',
  'main ol > li',
  'main #pricing > div > .grid > div',
].join(',');

const isMarketingRoot = (element: Element): element is HTMLElement =>
  element instanceof HTMLElement
  && Boolean(element.querySelector(':scope > header'))
  && Boolean(element.querySelector(':scope > footer'));

/**
 * Progressive enhancement for public marketing pages only. Content is visible by
 * default; pending reveal styles are attached only after JavaScript has mounted.
 */
export const PublicMotion = () => {
  const location = useLocation();

  useEffect(() => {
    let disposed = false;
    let routeTimer = 0;
    let frame = 0;
    let revealObserver: IntersectionObserver | undefined;
    let cleanupPage: (() => void) | undefined;

    const initialise = () => {
      if (disposed || cleanupPage) return;
      const root = Array.from(document.querySelectorAll('.ww-public')).find(isMarketingRoot);
      if (!root) return;

      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
      root.dataset.wwMotion = reduceMotion.matches ? 'reduced' : 'enabled';

      if (!reduceMotion.matches) {
        root.classList.add('ww-route-enter');
        routeTimer = window.setTimeout(() => root.classList.remove('ww-route-enter'), 280);
      }

      const candidates = Array.from(root.querySelectorAll<HTMLElement>(REVEAL_SELECTOR))
        .filter((element, index, all) => {
          if (element.closest('[data-ww-motion="static"], form, dialog, [role="dialog"]')) return false;
          if (element.matches('article') && element.parentElement?.matches('main')) return false;
          return all.indexOf(element) === index;
        });

      if (!reduceMotion.matches && 'IntersectionObserver' in window) {
        revealObserver = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const element = entry.target as HTMLElement;
            element.dataset.wwReveal = 'visible';
            revealObserver?.unobserve(element);
          });
        }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
      }

      const viewportHeight = window.innerHeight;
      candidates.forEach((element) => {
        const siblings = element.parentElement
          ? candidates.filter((candidate) => candidate.parentElement === element.parentElement)
          : [];
        const siblingIndex = siblings.indexOf(element);
        element.style.setProperty('--ww-motion-delay', `${Math.min(Math.max(siblingIndex, 0), 4) * 55}ms`);
        if (reduceMotion.matches || element.getBoundingClientRect().top < viewportHeight * 0.92) {
          element.dataset.wwReveal = 'visible';
        } else {
          element.dataset.wwReveal = 'pending';
          revealObserver?.observe(element);
        }
      });

      const parallaxQuery = window.matchMedia('(min-width: 768px) and (prefers-reduced-motion: no-preference)');
      const parallaxMedia = Array.from(root.querySelectorAll<HTMLElement>('[data-ww-parallax]'));
      const process = root.querySelector<HTMLElement>('[data-ww-process]');

      const updateScrollMotion = () => {
        frame = 0;
        if (parallaxQuery.matches) {
          parallaxMedia.forEach((media) => {
            const rect = media.getBoundingClientRect();
            if (rect.bottom < 0 || rect.top > window.innerHeight) return;
            const viewportProgress = ((rect.top + rect.height / 2) - window.innerHeight / 2) / window.innerHeight;
            const offset = Math.max(-14, Math.min(14, viewportProgress * -18));
            media.style.setProperty('--ww-parallax-y', `${offset.toFixed(2)}px`);
          });
        }

        if (process) {
          const rect = process.getBoundingClientRect();
          const start = window.innerHeight * 0.72;
          const progress = Math.max(0, Math.min(1, (start - rect.top) / Math.max(rect.height - window.innerHeight * 0.25, 1)));
          process.style.setProperty('--ww-process-progress', progress.toFixed(3));
          process.querySelectorAll<HTMLElement>('[data-ww-process-stage]').forEach((stage) => {
            stage.dataset.wwProcessActive = stage.getBoundingClientRect().top < start ? 'true' : 'false';
          });
        }
      };

      const requestScrollUpdate = () => {
        if (!frame) frame = window.requestAnimationFrame(updateScrollMotion);
      };
      if (!reduceMotion.matches && (parallaxMedia.length || process)) {
        window.addEventListener('scroll', requestScrollUpdate, { passive: true });
        window.addEventListener('resize', requestScrollUpdate, { passive: true });
        updateScrollMotion();
      }

      cleanupPage = () => {
        window.clearTimeout(routeTimer);
        revealObserver?.disconnect();
        window.removeEventListener('scroll', requestScrollUpdate);
        window.removeEventListener('resize', requestScrollUpdate);
        if (frame) window.cancelAnimationFrame(frame);
        root.classList.remove('ww-route-enter');
        delete root.dataset.wwMotion;
      };
    };

    const rootObserver = new MutationObserver(initialise);
    rootObserver.observe(document.getElementById('root') ?? document.body, { childList: true, subtree: true });
    frame = window.requestAnimationFrame(initialise);

    return () => {
      disposed = true;
      rootObserver?.disconnect();
      cleanupPage?.();
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [location.pathname]);

  return null;
};
