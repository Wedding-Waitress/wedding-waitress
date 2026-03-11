import React, { useRef, useCallback, useEffect, useState } from 'react';
import { RotateCw } from 'lucide-react';

interface InteractiveTextOverlayProps {
  /** The element's bounding rect relative to the container */
  children: React.ReactNode;
  isSelected: boolean;
  onSelect: () => void;
  onMove?: (dxPercent: number, dyPercent: number) => void;
  onResize?: (dWidthPercent: number, side: 'left' | 'right') => void;
  onRotate?: (degrees: number) => void;
  /** Container ref for coordinate conversion */
  containerRef: React.RefObject<HTMLElement>;
  showResizeHandles?: boolean;
  showRotateHandle?: boolean;
  rotation?: number;
  className?: string;
  style?: React.CSSProperties;
}

type DragMode = 'move' | 'resize-left' | 'resize-right' | 'rotate' | null;

export const InteractiveTextOverlay: React.FC<InteractiveTextOverlayProps> = ({
  children,
  isSelected,
  onSelect,
  onMove,
  onResize,
  onRotate,
  containerRef,
  showResizeHandles = true,
  showRotateHandle = true,
  rotation = 0,
  className = '',
  style = {},
}) => {
  const elRef = useRef<HTMLDivElement>(null);
  const dragMode = useRef<DragMode>(null);
  const startPos = useRef({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const handlePointerDown = useCallback((e: React.PointerEvent, mode: DragMode) => {
    e.stopPropagation();
    e.preventDefault();
    dragMode.current = mode;
    startPos.current = { x: e.clientX, y: e.clientY };
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragMode.current || !containerRef.current) return;
    e.stopPropagation();
    e.preventDefault();

    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    const dx = e.clientX - startPos.current.x;
    const dy = e.clientY - startPos.current.y;

    if (dragMode.current === 'move' && onMove) {
      const dxPercent = (dx / rect.width) * 100;
      const dyPercent = (dy / rect.height) * 100;
      startPos.current = { x: e.clientX, y: e.clientY };
      onMove(dxPercent, dyPercent);
    } else if ((dragMode.current === 'resize-left' || dragMode.current === 'resize-right') && onResize) {
      const dWidthPercent = (dx / rect.width) * 100;
      startPos.current = { x: e.clientX, y: e.clientY };
      onResize(dWidthPercent, dragMode.current === 'resize-left' ? 'left' : 'right');
    } else if (dragMode.current === 'rotate' && onRotate && elRef.current) {
      const elRect = elRef.current.getBoundingClientRect();
      const centerX = elRect.left + elRect.width / 2;
      const centerY = elRect.top + elRect.height / 2;
      const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI) + 90;
      // Snap to nearest 5 degrees if close
      const snapped = Math.abs(angle % 45) < 3 ? Math.round(angle / 45) * 45 : Math.round(angle);
      onRotate(snapped);
    }
  }, [containerRef, onMove, onResize, onRotate]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (dragMode.current) {
      e.stopPropagation();
      dragMode.current = null;
      setIsDragging(false);
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    }
  }, []);

  return (
    <div
      ref={elRef}
      className={`${className}`}
      style={{
        ...style,
        cursor: isSelected ? (isDragging ? 'grabbing' : 'grab') : 'pointer',
        position: 'absolute',
        userSelect: 'none',
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onPointerDown={(e) => {
        if (!isSelected) {
          e.stopPropagation();
          onSelect();
          return;
        }
        handlePointerDown(e, 'move');
      }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {children}

      {isSelected && (
        <>
          {/* Selection border */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              border: '2px dashed hsl(var(--primary))',
              borderRadius: '2px',
            }}
          />

          {/* Left resize handle */}
          {showResizeHandles && onResize && (
            <div
              className="absolute bg-primary border-2 border-primary-foreground shadow-sm"
              style={{
                width: 10,
                height: 10,
                left: -5,
                top: '50%',
                transform: 'translateY(-50%)',
                cursor: 'ew-resize',
                borderRadius: 2,
                zIndex: 10,
              }}
              onPointerDown={(e) => handlePointerDown(e, 'resize-left')}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            />
          )}

          {/* Right resize handle */}
          {showResizeHandles && onResize && (
            <div
              className="absolute bg-primary border-2 border-primary-foreground shadow-sm"
              style={{
                width: 10,
                height: 10,
                right: -5,
                top: '50%',
                transform: 'translateY(-50%)',
                cursor: 'ew-resize',
                borderRadius: 2,
                zIndex: 10,
              }}
              onPointerDown={(e) => handlePointerDown(e, 'resize-right')}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            />
          )}

          {/* Rotation handle */}
          {showRotateHandle && onRotate && (
            <>
              {/* Line from top center to rotation handle */}
              <div
                className="absolute pointer-events-none"
                style={{
                  width: 1,
                  height: 24,
                  left: '50%',
                  top: -24,
                  transform: 'translateX(-50%)',
                  backgroundColor: 'hsl(var(--primary))',
                }}
              />
              {/* Rotation circle */}
              <div
                className="absolute bg-primary text-primary-foreground flex items-center justify-center shadow-md"
                style={{
                  width: 20,
                  height: 20,
                  left: '50%',
                  top: -44,
                  transform: 'translateX(-50%)',
                  borderRadius: '50%',
                  cursor: 'grab',
                  zIndex: 10,
                }}
                onPointerDown={(e) => handlePointerDown(e, 'rotate')}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
              >
                <RotateCw className="h-3 w-3" />
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};
