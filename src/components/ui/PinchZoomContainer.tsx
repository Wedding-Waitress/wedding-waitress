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

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: 'relative',
        overflow: 'hidden',
        touchAction: 'pan-y',
        width: '100%',
      }}
    >
      <div
        {...handlers}
        style={{
          transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`,
          transformOrigin: 'top center',
          transition: isAnimating ? 'transform 0.3s ease' : undefined,
          width: fitToContainer ? 'max-content' : '100%',
          margin: fitToContainer ? '0 auto' : undefined,
          willChange: 'transform',
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
