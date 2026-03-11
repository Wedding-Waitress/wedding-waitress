import React, { useRef, useCallback, useState, useLayoutEffect } from 'react';
import { RotateCcw } from 'lucide-react';

interface InteractiveTextOverlayProps {
  children: React.ReactNode;
  isSelected: boolean;
  onSelect: () => void;
  onMove?: (dxPercent: number, dyPercent: number) => void;
  onResize?: (dWidthPercent: number, side: 'left' | 'right' | 'top' | 'bottom') => void;
  onCornerResize?: (dWidthPercent: number, dyPercent: number, corner: string) => void;
  onRotate?: (degrees: number) => void;
  onDragMove?: (pixelOffset: { x: number; y: number }) => void;
  onDragEnd?: () => void;
  containerRef: React.RefObject<HTMLElement>;
  showResizeHandles?: boolean;
  showRotateHandle?: boolean;
  rotation?: number;
  className?: string;
  style?: React.CSSProperties;
}

type DragMode =
  | 'move'
  | 'resize-left' | 'resize-right' | 'resize-top' | 'resize-bottom'
  | 'resize-tl' | 'resize-tr' | 'resize-bl' | 'resize-br'
  | 'rotate'
  | null;

const HANDLE = 8;
const HALF = HANDLE / 2;

const baseHandle: React.CSSProperties = {
  position: 'absolute',
  width: HANDLE,
  height: HANDLE,
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
  onDragMove,
  onDragEnd,
  containerRef,
  showResizeHandles = true,
  showRotateHandle = true,
  rotation = 0,
  className = '',
  style = {},
}) => {
  const elRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const accumRef = useRef({ x: 0, y: 0 });
  const resizeAccumRef = useRef({ dWidth: 0, dLeft: 0 });
  const pendingClearRef = useRef(false);
  const initialStyleRef = useRef({ width: '', left: '' });

  // Clear the drag/resize visual overrides AFTER React re-renders with updated positions
  useLayoutEffect(() => {
    if (pendingClearRef.current && elRef.current) {
      elRef.current.style.transform = rotation ? `rotate(${rotation}deg)` : '';
      elRef.current.style.width = '';
      elRef.current.style.left = '';
      accumRef.current = { x: 0, y: 0 };
      resizeAccumRef.current = { dWidth: 0, dLeft: 0 };
      pendingClearRef.current = false;
    }
  });

  const startDrag = useCallback((e: React.PointerEvent, mode: DragMode) => {
    e.stopPropagation();
    e.preventDefault();
    if (!containerRef.current) return;

    setIsDragging(true);
    let lastX = e.clientX;
    let lastY = e.clientY;
    accumRef.current = { x: 0, y: 0 };
    resizeAccumRef.current = { dWidth: 0, dLeft: 0 };

    // Capture initial computed styles for resize visual feedback
    if (elRef.current) {
      initialStyleRef.current = {
        width: elRef.current.style.width || '',
        left: elRef.current.style.left || '',
      };
    }

    const isResizeMode = mode?.startsWith('resize-') && mode !== 'rotate';

    const onPointerMove = (ev: PointerEvent) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const dx = ev.clientX - lastX;
      const dy = ev.clientY - lastY;
      lastX = ev.clientX;
      lastY = ev.clientY;

      if (mode === 'move') {
        accumRef.current.x += dx;
        accumRef.current.y += dy;
        if (elRef.current) {
          const rot = rotation ? `rotate(${rotation}deg)` : '';
          elRef.current.style.transform = `translate(${accumRef.current.x}px, ${accumRef.current.y}px) ${rot}`;
        }
        onDragMove?.({ x: accumRef.current.x, y: accumRef.current.y });
        return;
      }

      if (isResizeMode && elRef.current) {
        const isLeft = mode === 'resize-left' || mode === 'resize-tl' || mode === 'resize-bl';
        const isHorizontal = mode !== 'resize-top' && mode !== 'resize-bottom';

        if (isHorizontal) {
          if (isLeft) {
            resizeAccumRef.current.dWidth -= dx;
            resizeAccumRef.current.dLeft += dx;
          } else {
            resizeAccumRef.current.dWidth += dx;
          }
        }

        // Apply visual feedback directly to DOM
        const currentWidth = parseFloat(initialStyleRef.current.width) || 0;
        const currentLeft = parseFloat(initialStyleRef.current.left) || 0;
        const containerWidth = rect.width;

        const dWidthPercent = (resizeAccumRef.current.dWidth / containerWidth) * 100;
        const dLeftPercent = (resizeAccumRef.current.dLeft / containerWidth) * 100;

        elRef.current.style.width = `${currentWidth + dWidthPercent}%`;
        if (isLeft) {
          elRef.current.style.left = `${currentLeft + dLeftPercent}%`;
        }
        return;
      }

      if (mode === 'rotate' && onRotate && elRef.current) {
        const elRect = elRef.current.getBoundingClientRect();
        const cx = elRect.left + elRect.width / 2;
        const cy = elRect.top + elRect.height / 2;
        let angle = Math.atan2(ev.clientY - cy, ev.clientX - cx) * (180 / Math.PI) + 90;
        if (angle < 0) angle += 360;
        const snapped = Math.abs(angle % 45) < 3 ? Math.round(angle / 45) * 45 : Math.round(angle);
        onRotate(snapped % 360);
      }
    };

    const onPointerUp = () => {
      setIsDragging(false);
      if (mode === 'move' && onMove) {
        const container = containerRef.current;
        if (container) {
          const rect = container.getBoundingClientRect();
          const dxP = (accumRef.current.x / rect.width) * 100;
          const dyP = (accumRef.current.y / rect.height) * 100;
          pendingClearRef.current = true;
          onMove(dxP, dyP);
        }
      }
      if (mode === 'move') {
        onDragEnd?.();
      }

      // Commit resize on release
      if (isResizeMode && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const dWidthP = (resizeAccumRef.current.dWidth / rect.width) * 100;
        const dLeftP = (resizeAccumRef.current.dLeft / rect.width) * 100;
        const isLeft = mode === 'resize-left' || mode === 'resize-tl' || mode === 'resize-bl';
        const isCorner = mode === 'resize-tl' || mode === 'resize-tr' || mode === 'resize-bl' || mode === 'resize-br';

        pendingClearRef.current = true;

        if (isCorner && onCornerResize) {
          const corner = mode!.replace('resize-', '');
          const dyP = 0; // vertical not used for width-only resize
          onCornerResize(isLeft ? -dWidthP : dWidthP, dyP, corner);
        } else if (onResize) {
          if (mode === 'resize-left') {
            onResize(-dWidthP, 'left');
          } else if (mode === 'resize-right') {
            onResize(dWidthP, 'right');
          } else if (mode === 'resize-top') {
            onResize(0, 'top');
          } else if (mode === 'resize-bottom') {
            onResize(0, 'bottom');
          }
        }
      }

      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
    };

    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
  }, [containerRef, onMove, onResize, onCornerResize, onRotate, onDragMove, onDragEnd, rotation]);

  const canResize = showResizeHandles && (onResize || onCornerResize);

  return (
    <div
      ref={elRef}
      className={className}
      style={{
        ...style,
        cursor: isSelected ? (isDragging ? 'grabbing' : 'move') : 'pointer',
        position: 'absolute',
        userSelect: 'none',
      }}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      onPointerDown={(e) => {
        if (!isSelected) { e.stopPropagation(); onSelect(); return; }
        startDrag(e, 'move');
      }}
    >
      {/* Prevent text selection when selected */}
      <div style={{ pointerEvents: isSelected ? 'none' : 'auto', userSelect: 'none' }}>
        {children}
      </div>

      {isSelected && (
        <>
          {/* Selection border */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ border: '2px dashed hsl(var(--primary))', borderRadius: 2 }}
          />

          {/* 8 resize handles */}
          {canResize && (
            <>
              {/* Top-left */}
              <Handle
                style={{ left: -HALF, top: -HALF, cursor: 'nwse-resize' }}
                onPointerDown={(e) => startDrag(e, 'resize-tl')}
              />
              {/* Top-center */}
              <Handle
                style={{ left: '50%', top: -HALF, transform: 'translateX(-50%)', cursor: 'ns-resize' }}
                onPointerDown={(e) => startDrag(e, 'resize-top')}
              />
              {/* Top-right */}
              <Handle
                style={{ right: -HALF, top: -HALF, cursor: 'nesw-resize' }}
                onPointerDown={(e) => startDrag(e, 'resize-tr')}
              />
              {/* Middle-left */}
              <Handle
                style={{ left: -HALF, top: '50%', transform: 'translateY(-50%)', cursor: 'ew-resize' }}
                onPointerDown={(e) => startDrag(e, 'resize-left')}
              />
              {/* Middle-right */}
              <Handle
                style={{ right: -HALF, top: '50%', transform: 'translateY(-50%)', cursor: 'ew-resize' }}
                onPointerDown={(e) => startDrag(e, 'resize-right')}
              />
              {/* Bottom-left */}
              <Handle
                style={{ left: -HALF, bottom: -HALF, cursor: 'nesw-resize' }}
                onPointerDown={(e) => startDrag(e, 'resize-bl')}
              />
              {/* Bottom-center */}
              <Handle
                style={{ left: '50%', bottom: -HALF, transform: 'translateX(-50%)', cursor: 'ns-resize' }}
                onPointerDown={(e) => startDrag(e, 'resize-bottom')}
              />
              {/* Bottom-right */}
              <Handle
                style={{ right: -HALF, bottom: -HALF, cursor: 'nwse-resize' }}
                onPointerDown={(e) => startDrag(e, 'resize-br')}
              />
            </>
          )}

          {/* Rotation handle — bottom-right offset */}
          {showRotateHandle && onRotate && (
            <div
              className="absolute bg-primary text-primary-foreground flex items-center justify-center shadow-md"
              style={{
                width: 20,
                height: 20,
                right: -22,
                bottom: -22,
                borderRadius: '50%',
                cursor: 'alias',
                zIndex: 10,
              }}
              onPointerDown={(e) => startDrag(e, 'rotate')}
            >
              <RotateCw className="h-3 w-3" />
            </div>
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
    style={{ ...baseHandle, ...extra }}
    onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); onPointerDown(e); }}
  />
);
