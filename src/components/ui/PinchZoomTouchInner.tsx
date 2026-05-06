import React, { useEffect, useRef, useState } from 'react';
import { usePinchToZoom } from '@/hooks/usePinchToZoom';
import type { PinchZoomContainerProps } from './PinchZoomContainer';

/**
 * Touch-only inner implementation. Lazy-loaded by PinchZoomContainer so the
 * pinch hook + ResizeObserver never load on non-touch desktop sessions.
 */
export const PinchZoomTouchInner: React.FC<PinchZoomContainerProps> = ({
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

  const [hintVisible, setHintVisible] = useState(false);

  useEffect(() => {
    if (!showHint) return;
    setHintVisible(true);
    const t = window.setTimeout(() => setHintVisible(false), 3000);
    return () => window.clearTimeout(t);
  }, [showHint]);

  const isTransformed =
    Math.abs(scale - 1) > 0.001 || translateX !== 0 || translateY !== 0;

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
        {...handlers}
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

      {showHint && (
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
