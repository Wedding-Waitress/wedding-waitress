import React, { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Pinch-to-zoom wrapper for the A4 dietary preview on mobile/tablet (<1024px).
 * Desktop (>=1024px) renders children unchanged inside a centered flex container.
 *
 * - Initial scale = containerWidth / 794 (A4 width in px at 96dpi)
 * - Min scale = fitScale, Max scale = 2.5
 * - Two-finger pinch to zoom
 * - Single-finger pan when zoomed in above fitScale
 * - Double-tap to reset to fitScale (smooth)
 */

const A4_WIDTH_PX = 794;   // 210mm @ 96dpi
const A4_HEIGHT_PX = 1228; // ~325mm @ 96dpi (minHeight of preview)
const MAX_SCALE = 2.5;

export const PinchZoomA4Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMobile, setIsMobile] = useState<boolean>(
    typeof window !== 'undefined' ? window.innerWidth < 1024 : false
  );
  const containerRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const [fitScale, setFitScale] = useState(1);
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [animate, setAnimate] = useState(false);

  const stateRef = useRef({ scale: 1, tx: 0, ty: 0, fitScale: 1 });
  useEffect(() => {
    stateRef.current = { scale, tx, ty, fitScale };
  }, [scale, tx, ty, fitScale]);

  // Detect viewport
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Measure container and compute fitScale
  useEffect(() => {
    if (!isMobile) return;
    const compute = () => {
      const el = containerRef.current;
      if (!el) return;
      const w = el.clientWidth;
      const f = Math.min(1, w / A4_WIDTH_PX);
      setFitScale(f);
      setScale(f);
      setTx(0);
      setTy(0);
    };
    compute();
    const ro = new ResizeObserver(compute);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [isMobile]);

  // Gesture refs
  const pinchRef = useRef<{
    startDist: number;
    startScale: number;
    centerX: number;
    centerY: number;
    startTx: number;
    startTy: number;
  } | null>(null);
  const panRef = useRef<{ x: number; y: number; startTx: number; startTy: number } | null>(null);
  const lastTapRef = useRef<number>(0);

  const clampScale = (s: number) => Math.max(stateRef.current.fitScale, Math.min(MAX_SCALE, s));

  const resetView = useCallback(() => {
    setAnimate(true);
    setScale(stateRef.current.fitScale);
    setTx(0);
    setTy(0);
    window.setTimeout(() => setAnimate(false), 320);
  }, []);

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const [a, b] = [e.touches[0], e.touches[1]];
      const dx = b.clientX - a.clientX;
      const dy = b.clientY - a.clientY;
      pinchRef.current = {
        startDist: Math.hypot(dx, dy),
        startScale: stateRef.current.scale,
        centerX: (a.clientX + b.clientX) / 2,
        centerY: (a.clientY + b.clientY) / 2,
        startTx: stateRef.current.tx,
        startTy: stateRef.current.ty,
      };
      panRef.current = null;
      setAnimate(false);
    } else if (e.touches.length === 1) {
      // Double-tap detection
      const now = Date.now();
      if (now - lastTapRef.current < 300) {
        e.preventDefault();
        resetView();
        lastTapRef.current = 0;
        return;
      }
      lastTapRef.current = now;

      // Only intercept single-finger pan when zoomed in beyond fit
      if (stateRef.current.scale > stateRef.current.fitScale + 0.001) {
        panRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
          startTx: stateRef.current.tx,
          startTy: stateRef.current.ty,
        };
        setAnimate(false);
      } else {
        panRef.current = null;
      }
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchRef.current) {
      e.preventDefault();
      const [a, b] = [e.touches[0], e.touches[1]];
      const dx = b.clientX - a.clientX;
      const dy = b.clientY - a.clientY;
      const dist = Math.hypot(dx, dy);
      const newScale = clampScale(pinchRef.current.startScale * (dist / pinchRef.current.startDist));
      setScale(newScale);
    } else if (e.touches.length === 1 && panRef.current) {
      e.preventDefault();
      const dx = e.touches[0].clientX - panRef.current.x;
      const dy = e.touches[0].clientY - panRef.current.y;
      setTx(panRef.current.startTx + dx);
      setTy(panRef.current.startTy + dy);
    }
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) pinchRef.current = null;
    if (e.touches.length === 0) panRef.current = null;
    // Snap back to fit if scale fell to fit
    if (stateRef.current.scale <= stateRef.current.fitScale + 0.001) {
      setTx(0);
      setTy(0);
    }
  };

  // Always render the pinch-zoom container so touch-enabled desktops also get
  // pinch/pan/double-tap. On non-touch desktops, fitScale=1 and no touch events
  // fire, so mouse/trackpad behaviour is unaffected.

  const scaledHeight = A4_HEIGHT_PX * scale;

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        overflow: 'hidden',
        touchAction: 'none',
        position: 'relative',
        height: scaledHeight,
      }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div
        ref={innerRef}
        style={{
          width: A4_WIDTH_PX,
          transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
          transformOrigin: 'top center',
          transition: animate ? 'transform 0.3s ease' : undefined,
          margin: '0 auto',
          willChange: 'transform',
        }}
      >
        {children}
      </div>
    </div>
  );
};
