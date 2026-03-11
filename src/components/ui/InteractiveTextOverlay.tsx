import React, { useRef, useCallback, useEffect, useState } from 'react';
import { RotateCw } from 'lucide-react';

interface InteractiveTextOverlayProps {
  children: React.ReactNode;
  isSelected: boolean;
  onSelect: () => void;
  onMove?: (dxPercent: number, dyPercent: number) => void;
  onResize?: (dWidthPercent: number, side: 'left' | 'right') => void;
  onCornerResize?: (dWidthPercent: number, dyPercent: number, corner: string) => void;
  onRotate?: (degrees: number) => void;
  containerRef: React.RefObject<HTMLElement>;
  showResizeHandles?: boolean;
  showRotateHandle?: boolean;
  rotation?: number;
  className?: string;
  style?: React.CSSProperties;
}

type DragMode =
  | 'move'
  | 'resize-left' | 'resize-right'
  | 'resize-tl' | 'resize-tr' | 'resize-bl' | 'resize-br'
  | 'rotate'
  | null;

const HANDLE_SIZE = 10;
const HANDLE_HALF = HANDLE_SIZE / 2;

const handleBase: React.CSSProperties = {
  position: 'absolute',
  width: HANDLE_SIZE,
  height: HANDLE_SIZE,
  borderRadius: 2,
  zIndex: 10,
};

export const InteractiveTextOverlay: React.FC<InteractiveTextOverlayProps> = ({
  children,
  isSelected,
  onSelect,
  onMove,
  onResize,
  onCornerResize,
  onRotate,
  containerRef,
  showResizeHandles = true,
  showRotateHandle = true,
  rotation = 0,
  className = '',
  style = {},
}) => {
  const elRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const startDrag = useCallback((e: React.PointerEvent, mode: DragMode) => {
    e.stopPropagation();
    e.preventDefault();
    if (!containerRef.current) return;

    setIsDragging(true);
    let lastX = e.clientX;
    let lastY = e.clientY;

    const onPointerMove = (ev: PointerEvent) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const dx = ev.clientX - lastX;
      const dy = ev.clientY - lastY;
      lastX = ev.clientX;
      lastY = ev.clientY;

      const dxP = (dx / rect.width) * 100;
      const dyP = (dy / rect.height) * 100;

      if (mode === 'move' && onMove) {
        onMove(dxP, dyP);
      } else if (mode === 'resize-left' && onResize) {
        onResize((dx / rect.width) * 100, 'left');
      } else if (mode === 'resize-right' && onResize) {
        onResize((dx / rect.width) * 100, 'right');
      } else if (mode?.startsWith('resize-') && onCornerResize) {
        const corner = mode.replace('resize-', '');
        onCornerResize(dxP, dyP, corner);
      } else if (mode === 'rotate' && onRotate && elRef.current) {
        const elRect = elRef.current.getBoundingClientRect();
        const cx = elRect.left + elRect.width / 2;
        const cy = elRect.top + elRect.height / 2;
        let angle = Math.atan2(ev.clientY - cy, ev.clientX - cx) * (180 / Math.PI) + 90;
        // Normalize to 0-360
        if (angle < 0) angle += 360;
        // Snap to 45° increments if within 3°
        const snapped = Math.abs(angle % 45) < 3 ? Math.round(angle / 45) * 45 : Math.round(angle);
        onRotate(snapped % 360);
      }
    };

    const onPointerUp = () => {
      setIsDragging(false);
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
    };

    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
  }, [containerRef, onMove, onResize, onCornerResize, onRotate]);

  const canResize = showResizeHandles && (onResize || onCornerResize);

  return (
    <div
      ref={elRef}
      className={className}
      style={{
        ...style,
        cursor: isSelected ? (isDragging ? 'grabbing' : 'grab') : 'pointer',
        position: 'absolute',
        userSelect: 'none',
      }}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      onPointerDown={(e) => {
        if (!isSelected) { e.stopPropagation(); onSelect(); return; }
        startDrag(e, 'move');
      }}
    >
      {children}

      {isSelected && (
        <>
          {/* Selection border */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ border: '2px dashed hsl(var(--primary))', borderRadius: 2 }}
          />

          {/* 6 resize handles: 4 corners + 2 side midpoints */}
          {canResize && (
            <>
              {/* Top-left */}
              <Handle
                style={{ left: -HANDLE_HALF, top: -HANDLE_HALF, cursor: 'nwse-resize' }}
                onPointerDown={(e) => startDrag(e, 'resize-tl')}
              />
              {/* Top-right */}
              <Handle
                style={{ right: -HANDLE_HALF, top: -HANDLE_HALF, cursor: 'nesw-resize' }}
                onPointerDown={(e) => startDrag(e, 'resize-tr')}
              />
              {/* Bottom-left */}
              <Handle
                style={{ left: -HANDLE_HALF, bottom: -HANDLE_HALF, cursor: 'nesw-resize' }}
                onPointerDown={(e) => startDrag(e, 'resize-bl')}
              />
              {/* Bottom-right */}
              <Handle
                style={{ right: -HANDLE_HALF, bottom: -HANDLE_HALF, cursor: 'nwse-resize' }}
                onPointerDown={(e) => startDrag(e, 'resize-br')}
              />
              {/* Middle-left */}
              <Handle
                style={{ left: -HANDLE_HALF, top: '50%', transform: 'translateY(-50%)', cursor: 'ew-resize' }}
                onPointerDown={(e) => startDrag(e, 'resize-left')}
              />
              {/* Middle-right */}
              <Handle
                style={{ right: -HANDLE_HALF, top: '50%', transform: 'translateY(-50%)', cursor: 'ew-resize' }}
                onPointerDown={(e) => startDrag(e, 'resize-right')}
              />
            </>
          )}

          {/* Rotation handle */}
          {showRotateHandle && onRotate && (
            <>
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
                onPointerDown={(e) => startDrag(e, 'rotate')}
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

/** Small square handle */
const Handle: React.FC<{
  style: React.CSSProperties;
  onPointerDown: (e: React.PointerEvent) => void;
}> = ({ style: extra, onPointerDown }) => (
  <div
    className="absolute bg-primary border-2 border-primary-foreground shadow-sm"
    style={{ ...handleBase, ...extra }}
    onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); onPointerDown(e); }}
  />
);
