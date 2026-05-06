/**
 * WEDDING WAITRESS — GLOBAL RULE
 * PinchZoomContainer MUST be applied to all content areas on every page.
 * Active on ALL touch-capable devices: touch PCs, tablets, and mobile phones.
 * Detection must use: navigator.maxTouchPoints > 0
 * Do NOT restrict to viewport breakpoints (sm/md/lg).
 * See existing pages for implementation examples.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type React from 'react';

export interface UsePinchToZoomOptions {
  minScale?: number;
  maxScale?: number;
  initialScale?: number;
  fitToContainer?: boolean;
  naturalWidth?: number;
}

export interface UsePinchToZoomHandlers {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
}

export interface UsePinchToZoomReturn {
  scale: number;
  translateX: number;
  translateY: number;
  fitScale: number;
  isAnimating: boolean;
  handlers: UsePinchToZoomHandlers;
  reset: () => void;
}

/**
 * Reusable pinch-to-zoom + drag-to-pan + double-tap-to-reset hook.
 * Touch-only; mouse interactions are not affected.
 */
export function usePinchToZoom(
  containerRef: React.RefObject<HTMLElement>,
  options: UsePinchToZoomOptions = {}
): UsePinchToZoomReturn {
  const {
    minScale = 0.25,
    maxScale = 3.0,
    initialScale = 1,
    fitToContainer = false,
    naturalWidth,
  } = options;

  const [fitScale, setFitScale] = useState(initialScale);
  const [scale, setScale] = useState(initialScale);
  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const userInteracted = useRef(false);
  const pinchStartDist = useRef<number | null>(null);
  const pinchStartScale = useRef(initialScale);
  const panStart = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);
  const lastTapTime = useRef(0);

  // Never let the floor fall below the user-supplied minScale.
  const effectiveMin = fitToContainer ? Math.max(minScale, fitScale) : minScale;

  const reset = useCallback(() => {
    setIsAnimating(true);
    setScale(effectiveMin);
    setTranslateX(0);
    setTranslateY(0);
    userInteracted.current = false;
    window.setTimeout(() => setIsAnimating(false), 320);
  }, [effectiveMin]);

  // Recompute fitScale when fitToContainer is enabled
  useEffect(() => {
    if (!fitToContainer || !naturalWidth) return;
    const el = containerRef.current;
    if (!el) return;

    const compute = () => {
      const w = el.clientWidth || 1;
      const f = Math.min(1, w / naturalWidth);
      setFitScale(f);
      // Do NOT auto-scale content at rest. Leave scale=1 so the page
      // renders in its natural responsive flow; user can pinch in/out.
    };

    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    window.addEventListener('resize', compute);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', compute);
    };
  }, [containerRef, fitToContainer, naturalWidth]);

  const distance = (a: React.Touch, b: React.Touch) => {
    const dx = a.clientX - b.clientX;
    const dy = a.clientY - b.clientY;
    return Math.hypot(dx, dy);
  };

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2) {
        setIsAnimating(false);
        pinchStartDist.current = distance(e.touches[0], e.touches[1]);
        pinchStartScale.current = scale;
        panStart.current = null;
      } else if (e.touches.length === 1) {
        const now = Date.now();
        if (now - lastTapTime.current < 300) {
          reset();
          lastTapTime.current = 0;
          return;
        }
        lastTapTime.current = now;

        if (scale > effectiveMin + 0.001) {
          setIsAnimating(false);
          panStart.current = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY,
            tx: translateX,
            ty: translateY,
          };
        } else {
          panStart.current = null;
        }
      }
    },
    [scale, effectiveMin, translateX, translateY, reset]
  );

  // rAF-coalesced pending updates — collapse many touchmove events per frame
  // into a single React state update. Massive perf win during pinch/pan.
  const rafIdRef = useRef<number | null>(null);
  const pendingRef = useRef<{ scale?: number; tx?: number; ty?: number }>({});
  const flush = useCallback(() => {
    rafIdRef.current = null;
    const p = pendingRef.current;
    pendingRef.current = {};
    if (p.scale !== undefined) setScale(p.scale);
    if (p.tx !== undefined) setTranslateX(p.tx);
    if (p.ty !== undefined) setTranslateY(p.ty);
  }, []);
  const schedule = useCallback(
    (patch: { scale?: number; tx?: number; ty?: number }) => {
      pendingRef.current = { ...pendingRef.current, ...patch };
      if (rafIdRef.current == null) {
        rafIdRef.current = window.requestAnimationFrame(flush);
      }
    },
    [flush]
  );

  useEffect(() => {
    return () => {
      if (rafIdRef.current != null) {
        window.cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, []);

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2 && pinchStartDist.current != null) {
        e.preventDefault();
        const d = distance(e.touches[0], e.touches[1]);
        const ratio = d / pinchStartDist.current;
        let next = pinchStartScale.current * ratio;
        next = Math.max(effectiveMin, Math.min(maxScale, next));
        userInteracted.current = true;
        schedule({ scale: next });
      } else if (e.touches.length === 1 && panStart.current) {
        e.preventDefault();
        const dx = e.touches[0].clientX - panStart.current.x;
        const dy = e.touches[0].clientY - panStart.current.y;
        userInteracted.current = true;
        schedule({ tx: panStart.current.tx + dx, ty: panStart.current.ty + dy });
      }
    },
    [effectiveMin, maxScale, schedule]
  );


  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (e.touches.length < 2) pinchStartDist.current = null;
    if (e.touches.length === 0) panStart.current = null;
  }, []);

  return {
    scale,
    translateX,
    translateY,
    fitScale,
    isAnimating,
    handlers: { onTouchStart, onTouchMove, onTouchEnd },
    reset,
  };
}
