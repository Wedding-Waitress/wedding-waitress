import React, { useEffect, useRef, useState } from 'react';

interface PinchZoomFloorPlanProps {
  children: React.ReactNode;
}

/**
 * Pinch-to-zoom + drag-to-pan wrapper for the Floor Plan diagram.
 * Touch-only; mouse interactions remain untouched so desktop click/scroll/drag
 * for settings still work normally.
 *
 * - Desktop (>=1024px): initial scale = 1, min = 0.5, max = 3.0
 * - Tablet/Mobile (<1024px): initial scale = fitScale (container/natural),
 *   min = fitScale, max = 3.0
 * - Double-tap resets to initial scale.
 */
export const PinchZoomFloorPlan: React.FC<PinchZoomFloorPlanProps> = ({ children }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  const [isDesktop, setIsDesktop] = useState<boolean>(
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  );
  const [fitScale, setFitScale] = useState(1);
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [animate, setAnimate] = useState(false);
  const [showHint, setShowHint] = useState(true);

  // Gesture state
  const pinchStartDist = useRef<number | null>(null);
  const pinchStartScale = useRef(1);
  const panStart = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);
  const lastTapTime = useRef(0);

  const minScale = isDesktop ? 0.5 : fitScale;
  const maxScale = 3.0;

  // Compute natural diagram width and fit scale
  useEffect(() => {
    const compute = () => {
      const desktop = window.innerWidth >= 1024;
      setIsDesktop(desktop);
      const container = containerRef.current;
      const inner = innerRef.current;
      if (!container || !inner) return;
      const naturalWidth = inner.scrollWidth || inner.offsetWidth || 1;
      const containerWidth = container.clientWidth || 1;
      if (desktop) {
        setFitScale(1);
        setScale(1);
        setTx(0);
        setTy(0);
      } else {
        const f = Math.min(1, containerWidth / naturalWidth);
        setFitScale(f);
        setScale(f);
        setTx(0);
        setTy(0);
      }
    };
    compute();
    const ro = new ResizeObserver(compute);
    if (containerRef.current) ro.observe(containerRef.current);
    if (innerRef.current) ro.observe(innerRef.current);
    window.addEventListener('resize', compute);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', compute);
    };
  }, []);

  // Hint auto-fade after 3s
  useEffect(() => {
    setShowHint(true);
    const t = window.setTimeout(() => setShowHint(false), 3000);
    return () => window.clearTimeout(t);
  }, []);

  const distance = (a: Touch, b: Touch) => {
    const dx = a.clientX - b.clientX;
    const dy = a.clientY - b.clientY;
    return Math.hypot(dx, dy);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      setAnimate(false);
      pinchStartDist.current = distance(e.touches[0] as unknown as Touch, e.touches[1] as unknown as Touch);
      pinchStartScale.current = scale;
      panStart.current = null;
    } else if (e.touches.length === 1) {
      // double-tap detect
      const now = Date.now();
      if (now - lastTapTime.current < 300) {
        setAnimate(true);
        setScale(fitScale);
        setTx(0);
        setTy(0);
        lastTapTime.current = 0;
        return;
      }
      lastTapTime.current = now;

      // Pan only when zoomed in beyond minimum
      if (scale > minScale + 0.001) {
        setAnimate(false);
        panStart.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
          tx,
          ty,
        };
      } else {
        panStart.current = null;
      }
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchStartDist.current != null) {
      e.preventDefault();
      const d = distance(e.touches[0] as unknown as Touch, e.touches[1] as unknown as Touch);
      const ratio = d / pinchStartDist.current;
      let next = pinchStartScale.current * ratio;
      next = Math.max(minScale, Math.min(maxScale, next));
      setScale(next);
    } else if (e.touches.length === 1 && panStart.current) {
      e.preventDefault();
      const dx = e.touches[0].clientX - panStart.current.x;
      const dy = e.touches[0].clientY - panStart.current.y;
      setTx(panStart.current.tx + dx);
      setTy(panStart.current.ty + dy);
    }
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) pinchStartDist.current = null;
    if (e.touches.length === 0) panStart.current = null;
  };

  return (
    <div ref={containerRef} className="relative w-full" style={{ overflow: 'hidden', touchAction: 'pan-y' }}>
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
          transformOrigin: 'top center',
          transition: animate ? 'transform 0.3s ease' : undefined,
          width: isDesktop ? '100%' : 'max-content',
          margin: isDesktop ? undefined : '0 auto',
        }}
        onTransitionEnd={() => setAnimate(false)}
      >
        <div ref={innerRef} style={{ width: isDesktop ? '100%' : 'max-content' }}>
          {children}
        </div>
      </div>
      <div
        className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-2 px-3 py-1.5 rounded-full text-xs bg-foreground/80 text-background transition-opacity duration-500"
        style={{ opacity: showHint ? 1 : 0 }}
      >
        👌 Pinch to zoom · Drag to pan
      </div>
    </div>
  );
};
