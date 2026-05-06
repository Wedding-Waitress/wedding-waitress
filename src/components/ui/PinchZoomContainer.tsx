/**
 * WEDDING WAITRESS — GLOBAL RULE
 * PinchZoomContainer MUST be applied to all content areas on every page.
 * Active on ALL touch-capable devices: touch PCs, tablets, and mobile phones.
 * Detection must use: navigator.maxTouchPoints > 0
 * Do NOT restrict to viewport breakpoints (sm/md/lg).
 * See existing pages for implementation examples.
 */
import React, { memo, useEffect, useState } from 'react';

export interface PinchZoomContainerProps {
  children: React.ReactNode;
  /** Natural pixel width of the inner content (e.g. 794 for A4). When set, content fits to container. */
  naturalWidth?: number;
  minScale?: number;
  maxScale?: number;
  initialScale?: number;
  showHint?: boolean;
  className?: string;
}

/**
 * Synchronous touch detection — avoids a re-render flash on first paint and lets
 * non-touch devices skip the entire zoom subsystem on initial mount.
 */
const detectTouch = () => {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || (navigator.maxTouchPoints ?? 0) > 0;
};

/**
 * Inner touch-only implementation. Lazy-mounted via dynamic import so the
 * pinch hook + ResizeObserver never load on non-touch desktop sessions.
 */
const TouchPinchZoom = React.lazy(() =>
  import('./PinchZoomTouchInner').then((m) => ({ default: m.PinchZoomTouchInner }))
);

/**
 * Drop-in wrapper that applies pinch-to-zoom, drag-to-pan, and double-tap-to-reset
 * to any child content. Touch-only — desktop mouse interactions are unaffected
 * AND the zoom code is never loaded on non-touch devices.
 */
const PinchZoomContainerImpl: React.FC<PinchZoomContainerProps> = ({
  children,
  naturalWidth,
  minScale = 0.5,
  maxScale = 3.0,
  initialScale = 1,
  showHint = true,
  className,
}) => {
  // Synchronous initial value avoids hydration flicker and prevents non-touch
  // desktops from ever paying the cost of the zoom subsystem.
  const [isTouch] = useState<boolean>(detectTouch);

  if (!isTouch) {
    // Non-touch path: render children directly inside a minimal wrapper so the
    // DOM shape stays equivalent to the touch path.
    return (
      <div
        className={`pinch-zoom-wrapper ${className ?? ''}`}
        style={{ position: 'relative', width: '100%' }}
      >
        <div style={{ width: '100%' }}>{children}</div>
      </div>
    );
  }

  return (
    <React.Suspense
      fallback={
        <div
          className={`pinch-zoom-wrapper ${className ?? ''}`}
          style={{ position: 'relative', width: '100%' }}
        >
          <div style={{ width: '100%' }}>{children}</div>
        </div>
      }
    >
      <TouchPinchZoom
        naturalWidth={naturalWidth}
        minScale={minScale}
        maxScale={maxScale}
        initialScale={initialScale}
        showHint={showHint}
        className={className}
      >
        {children}
      </TouchPinchZoom>
    </React.Suspense>
  );
};

export const PinchZoomContainer = memo(PinchZoomContainerImpl);
