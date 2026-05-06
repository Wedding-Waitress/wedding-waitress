/**
 * WEDDING WAITRESS — GLOBAL RULE
 * PinchZoomContainer MUST be applied to all content areas on every page.
 * Active on ALL touch-capable devices: touch PCs, tablets, and mobile phones.
 * Detection must use: navigator.maxTouchPoints > 0
 * Do NOT restrict to viewport breakpoints (sm/md/lg).
 * See existing pages for implementation examples.
 */
import React, { useEffect, useRef, useState } from 'react';
import { usePinchToZoom } from '@/hooks/usePinchToZoom';

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
 * Drop-in wrapper that applies pinch-to-zoom, drag-to-pan, and double-tap-to-reset
 * to any child content. Touch-only — desktop mouse interactions are unaffected.
 */
export const PinchZoomContainer: React.FC<PinchZoomContainerProps> = ({
  children,
  naturalWidth,
  minScale = 0.5,
  maxScale = 3.0,
  initialScale = 1,
  showHint = true,
  className,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const fitToContainer = typeof naturalWidth === 'number' && naturalWidth > 0;

  const { scale, translateX, translateY, isAnimating, handlers } = usePinchToZoom(
    containerRef,
    { minScale, maxScale, initialScale, fitToContainer, naturalWidth }
  );

  const [isTouch, setIsTouch] = useState(false);
  const [hintVisible, setHintVisible] = useState(false);

  useEffect(() => {
    const touch =
      typeof window !== 'undefined' &&
      ('ontouchstart' in window || (navigator.maxTouchPoints ?? 0) > 0);
    setIsTouch(touch);
    if (touch && showHint) {
      setHintVisible(true);
      const t = window.setTimeout(() => setHintVisible(false), 3000);
      return () => window.clearTimeout(t);
    }
  }, [showHint]);

  // Only "activate" transform/overflow/touchAction when the user is actually
  // zoomed/panned. At rest we leave the DOM untouched so position:fixed,
  // position:sticky, dropdowns, popovers, modals, and responsive layouts
  // inside behave normally.
  const isTransformed =
    isTouch &&
    (Math.abs(scale - 1) > 0.001 || translateX !== 0 || translateY !== 0);

  return (
    <div
      ref={containerRef}
      className={`pinch-zoom-wrapper ${className ?? ''}`}
      style={{
        position: 'relative',
        overflow: isTransformed ? 'hidden' : 'visible',
        touchAction: isTransformed ? 'pan-y' : 'auto',
        width: '100%',
      }}
    >
      <div
        {...(isTouch ? handlers : {})}
        style={{
          transform: isTransformed
            ? `translate(${translateX}px, ${translateY}px) scale(${scale})`
            : undefined,
          transformOrigin: '0 0',
          transition: isAnimating ? 'transform 0.3s ease' : undefined,
          width: '100%',
          willChange: isTransformed ? 'transform' : undefined,
        }}
      >
        {children}
      </div>

      {isTouch && showHint && (
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-2 px-3 py-1.5 rounded-full text-xs transition-opacity duration-500"
          style={{
            opacity: hintVisible ? 1 : 0,
            background: 'rgba(29, 29, 31, 0.8)',
            color: '#ffffff',
          }}
        >
          👌 Pinch to zoom · Drag to pan
        </div>
      )}
    </div>
  );
};
