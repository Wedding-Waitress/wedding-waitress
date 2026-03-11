import React, { useRef, useCallback, useState } from 'react';
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

  const getBaseTransform = useCallback(() => {
    const t = (style.transform as string) || '';
    return t.replace(/rotate\([^)]*\)/g, '').trim();
  }, [style.transform]);

  const startDrag = useCallback((e: React.PointerEvent, mode: DragMode) => {
    e.stopPropagation();
    e.preventDefault();
    if (!containerRef.current || !elRef.current) return;

    setIsDragging(true);
    let lastX = e.clientX;
    let lastY = e.clientY;

    const moveAccum = { x: 0, y: 0 };
    const resizeAccum = { dWidth: 0, dLeft: 0 };
    let currentAngle = rotation;

    const el = elRef.current;
    const baseTransform = getBaseTransform();
    const containerRect = containerRef.current.getBoundingClientRect();

    // Capture initial percentage values from inline styles
    const computedLeft = parseFloat(el.style.left) || 0;
    const computedWidth = parseFloat(el.style.width) || 0;

    const isResize = mode?.startsWith('resize-') ?? false;
    const isLeft = mode === 'resize-left' || mode === 'resize-tl' || mode === 'resize-bl';
    const isRight = mode === 'resize-right' || mode === 'resize-tr' || mode === 'resize-br';
    const isHorizontal = isLeft || isRight;

    const onPointerMove = (ev: PointerEvent) => {
      const dx = ev.clientX - lastX;
      const dy = ev.clientY - lastY;
      lastX = ev.clientX;
      lastY = ev.clientY;

      if (mode === 'move') {
        moveAccum.x += dx;
        moveAccum.y += dy;
        const rot = `rotate(${rotation}deg)`;
        el.style.transform = `${baseTransform} ${rot} translate(${moveAccum.x}px, ${moveAccum.y}px)`;
        onDragMove?.({ x: moveAccum.x, y: moveAccum.y });
        return;
      }

      if (isResize && isHorizontal) {
        if (isLeft) {
          resizeAccum.dWidth -= dx;
          resizeAccum.dLeft += dx;
        } else {
          resizeAccum.dWidth += dx;
        }
        const newWidthPct = computedWidth + (resizeAccum.dWidth / containerRect.width) * 100;
        el.style.width = `${Math.max(5, newWidthPct)}%`;
        if (isLeft) {
          const newLeftPct = computedLeft + (resizeAccum.dLeft / containerRect.width) * 100;
          el.style.left = `${newLeftPct}%`;
        }
        return;
      }

      if (mode === 'rotate') {
        const elRect = el.getBoundingClientRect();
        const cx = elRect.left + elRect.width / 2;
        const cy = elRect.top + elRect.height / 2;
        let angle = Math.atan2(ev.clientY - cy, ev.clientX - cx) * (180 / Math.PI) + 90;
        if (angle < 0) angle += 360;
        currentAngle = Math.abs(angle % 45) < 3 ? Math.round(angle / 45) * 45 : Math.round(angle);
        currentAngle = currentAngle % 360;
        el.style.transform = `${baseTransform} rotate(${currentAngle}deg)`;
      }
    };

    const onPointerUp = () => {
      setIsDragging(false);
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);

      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();

      if (mode === 'move' && onMove) {
        const dxP = (moveAccum.x / rect.width) * 100;
        const dyP = (moveAccum.y / rect.height) * 100;
        onMove(dxP, dyP);
        onDragEnd?.();
        return;
      }

      if (isResize) {
        const dWidthP = (resizeAccum.dWidth / rect.width) * 100;
        const isCorner = mode === 'resize-tl' || mode === 'resize-tr' || mode === 'resize-bl' || mode === 'resize-br';

        if (isCorner && onCornerResize) {
          const corner = mode!.replace('resize-', '');
          onCornerResize(isLeft ? -dWidthP : dWidthP, 0, corner);
        } else if (onResize) {
          if (mode === 'resize-left') {
            onResize(-dWidthP, 'left');
          } else if (mode === 'resize-right') {
            onResize(dWidthP, 'right');
          }
        }
        return;
      }

      if (mode === 'rotate' && onRotate) {
        onRotate(currentAngle);
      }
    };

    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
  }, [containerRef, onMove, onResize, onCornerResize, onRotate, onDragMove, onDragEnd, rotation, getBaseTransform]);

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
      <div style={{ pointerEvents: isSelected ? 'none' : 'auto', userSelect: 'none' }}>
        {children}
      </div>

      {isSelected && (
        <>
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ border: '2px dashed hsl(var(--primary))', borderRadius: 2 }}
          />

          {canResize && (
            <>
              <Handle
                style={{ left: -HALF, top: -HALF, cursor: 'nwse-resize' }}
                onPointerDown={(e) => startDrag(e, 'resize-tl')}
              />
              <Handle
                style={{ left: '50%', top: -HALF, transform: 'translateX(-50%)', cursor: 'ns-resize' }}
                onPointerDown={(e) => startDrag(e, 'resize-top')}
              />
              <Handle
                style={{ right: -HALF, top: -HALF, cursor: 'nesw-resize' }}
                onPointerDown={(e) => startDrag(e, 'resize-tr')}
              />
              <Handle
                style={{ left: -HALF, top: '50%', transform: 'translateY(-50%)', cursor: 'ew-resize' }}
                onPointerDown={(e) => startDrag(e, 'resize-left')}
              />
              <Handle
                style={{ right: -HALF, top: '50%', transform: 'translateY(-50%)', cursor: 'ew-resize' }}
                onPointerDown={(e) => startDrag(e, 'resize-right')}
              />
              <Handle
                style={{ left: -HALF, bottom: -HALF, cursor: 'nesw-resize' }}
                onPointerDown={(e) => startDrag(e, 'resize-bl')}
              />
              <Handle
                style={{ left: '50%', bottom: -HALF, transform: 'translateX(-50%)', cursor: 'ns-resize' }}
                onPointerDown={(e) => startDrag(e, 'resize-bottom')}
              />
              <Handle
                style={{ right: -HALF, bottom: -HALF, cursor: 'nwse-resize' }}
                onPointerDown={(e) => startDrag(e, 'resize-br')}
              />
            </>
          )}

          {showRotateHandle && onRotate && (
            <div
              className="absolute flex items-center justify-center"
              style={{
                width: 24,
                height: 24,
                right: -28,
                top: '50%',
                transform: 'translateY(-50%)',
                cursor: 'grab',
                zIndex: 10,
                color: 'hsl(var(--primary))',
              }}
              onPointerDown={(e) => startDrag(e, 'rotate')}
            >
              <RotateCcw className="h-4 w-4" strokeWidth={2.5} />
            </div>
          )}
        </>
      )}
    </div>
  );
};

const Handle: React.FC<{
  style: React.CSSProperties;
  onPointerDown: (e: React.PointerEvent) => void;
}> = ({ style: extra, onPointerDown }) => (
  <div
    className="absolute bg-primary border-2 border-primary-foreground shadow-sm"
    style={{
      position: 'absolute',
      width: HANDLE,
      height: HANDLE,
      borderRadius: 2,
      zIndex: 10,
      ...extra,
    }}
    onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); onPointerDown(e); }}
  />
);
