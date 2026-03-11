import React, { useRef, useCallback, useState } from 'react';
import { RotateCw, Move, Copy, CopyPlus, Trash2, RotateCcw } from 'lucide-react';

interface InteractiveTextOverlayProps {
  children: React.ReactNode;
  isSelected: boolean;
  onSelect: () => void;
  onMove?: (dxPercent: number, dyPercent: number) => void;
  onResize?: (dWidthPercent: number, side: 'left' | 'right' | 'top' | 'bottom') => void;
  onCornerResize?: (dWidthPercent: number, dyPercent: number, corner: string) => void;
  onFontSizeChange?: (deltaPx: number) => void;
  onRotate?: (degrees: number) => void;
  onDragMove?: (pixelOffset: { x: number; y: number }) => void;
  onDragEnd?: () => void;
  onCopy?: () => void;
  onReset?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  containerRef: React.RefObject<HTMLElement>;
  showResizeHandles?: boolean;
  showRotateHandle?: boolean;
  rotation?: number;
  className?: string;
  style?: React.CSSProperties;
}

const HANDLE = 8;
const HALF = HANDLE / 2;
const SNAP_THRESHOLD = 4;
const ROTATE_SENSITIVITY = 1.5;

export const InteractiveTextOverlay: React.FC<InteractiveTextOverlayProps> = ({
  children,
  isSelected,
  onSelect,
  onMove,
  onResize,
  onCornerResize,
  onFontSizeChange,
  onRotate,
  onDragMove,
  onDragEnd,
  onCopy,
  onReset,
  onDuplicate,
  onDelete,
  containerRef,
  showResizeHandles = true,
  showRotateHandle = true,
  rotation = 0,
  className = '',
  style = {},
}) => {
  const elRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [liveAngle, setLiveAngle] = useState<number | null>(null);
  const [isCornerResizing, setIsCornerResizing] = useState(false);
  const [liveFontDelta, setLiveFontDelta] = useState<number>(0);

  const getBaseTransform = useCallback((): string => {
    const t = (style.transform as string) || '';
    return t.replace(/rotate\([^)]*\)/g, '').trim();
  }, [style.transform]);

  const handlePointerDown = useCallback((e: React.PointerEvent, mode: string) => {
    e.stopPropagation();
    e.preventDefault();
    const el = elRef.current;
    const container = containerRef.current;
    if (!el || !container) return;

    setIsDragging(true);

    const startX = e.clientX;
    const startY = e.clientY;
    const containerRect = container.getBoundingClientRect();
    const baseTransform = getBaseTransform();

    const initLeft = parseFloat(el.style.left) || 0;
    const initWidth = parseFloat(el.style.width) || 0;
    const initTop = parseFloat(el.style.top) || 0;

    let accumX = 0;
    let accumY = 0;
    let currentAngle = rotation;
    let lastFontDelta = 0;

    if (mode === 'rotate') {
      setIsRotating(true);
      setLiveAngle(rotation);
    }

    if (mode.startsWith('fontsize-')) {
      setIsCornerResizing(true);
      setLiveFontDelta(0);
    }

    const onPointerMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;

      if (mode === 'move') {
        accumX = dx;
        accumY = dy;
        el.style.transform = `${baseTransform} rotate(${rotation}deg) translate(${dx}px, ${dy}px)`;
        onDragMove?.({ x: dx, y: dy });
        return;
      }

      if (mode === 'resize-left') {
        const dPct = (dx / containerRect.width) * 100;
        el.style.left = `${initLeft + dPct}%`;
        el.style.width = `${Math.max(5, initWidth - dPct)}%`;
        return;
      }

      if (mode === 'resize-right') {
        const dPct = (dx / containerRect.width) * 100;
        el.style.width = `${Math.max(5, initWidth + dPct)}%`;
        return;
      }

      if (mode.startsWith('fontsize-')) {
        const corner = mode.replace('fontsize-', '');
        const isLeft = corner === 'tl' || corner === 'bl';
        const rawDx = isLeft ? -dx : dx;
        const rawDy = (corner === 'tl' || corner === 'tr') ? -dy : dy;
        const avgDelta = (rawDx + rawDy) / 2;
        const newDelta = Math.round(avgDelta * 0.15);
        if (newDelta !== lastFontDelta) {
          const stepDelta = newDelta - lastFontDelta;
          lastFontDelta = newDelta;
          setLiveFontDelta(newDelta);
          if (onFontSizeChange && stepDelta !== 0) {
            onFontSizeChange(stepDelta);
          }
        }
        return;
      }

      if (mode === 'rotate') {
        let raw = rotation - dx * ROTATE_SENSITIVITY;
        raw = ((raw % 360) + 360) % 360;
        if (raw > 180) raw -= 360;
        if (Math.abs(raw) < SNAP_THRESHOLD) raw = 0;
        currentAngle = Math.round(raw);
        setLiveAngle(currentAngle);
        const finalDeg = ((currentAngle % 360) + 360) % 360;
        el.style.transform = `${baseTransform} rotate(${finalDeg}deg)`;
      }
    };

    const onPointerUp = () => {
      setIsDragging(false);
      setIsRotating(false);
      setLiveAngle(null);
      setIsCornerResizing(false);
      setLiveFontDelta(0);
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);

      const rect = containerRect;

      if (mode === 'move' && onMove) {
        const dxP = (accumX / rect.width) * 100;
        const dyP = (accumY / rect.height) * 100;
        const newLeft = initLeft + dxP;
        const newTop = initTop + dyP;
        el.style.left = `${newLeft}%`;
        el.style.top = `${newTop}%`;
        el.style.transform = `${baseTransform} rotate(${rotation}deg)`;
        onMove(dxP, dyP);
        onDragEnd?.();
        return;
      }

      if (mode === 'resize-left' && onResize) {
        const finalWidth = parseFloat(el.style.width) || initWidth;
        const dWidthP = finalWidth - initWidth;
        onResize(-dWidthP, 'left');
        return;
      }

      if (mode === 'resize-right' && onResize) {
        const finalWidth = parseFloat(el.style.width) || initWidth;
        const dWidthP = finalWidth - initWidth;
        onResize(dWidthP, 'right');
        return;
      }

      if (mode.startsWith('fontsize-')) {
        // Already committed in real-time during drag
        return;
      }

      if (mode === 'rotate' && onRotate) {
        const finalDeg = ((currentAngle % 360) + 360) % 360;
        el.style.transform = `${baseTransform} rotate(${finalDeg}deg)`;
        onRotate(finalDeg);
      }
    };

    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
  }, [containerRef, onMove, onResize, onCornerResize, onFontSizeChange, onRotate, onDragMove, onDragEnd, rotation, getBaseTransform]);

  const canResize = showResizeHandles && (onResize || onCornerResize || onFontSizeChange);
  const hasToolbar = onCopy || onReset || onDuplicate || onDelete;
  const displayAngle = liveAngle !== null ? liveAngle : (rotation > 180 ? rotation - 360 : rotation);

  return (
    <div
      ref={elRef}
      className={className}
      style={{
        ...style,
        cursor: isSelected ? (isDragging ? 'grabbing' : 'move') : 'pointer',
        position: 'absolute',
        userSelect: 'none',
        zIndex: isSelected ? 20 : 1,
      }}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      onPointerDown={(e) => {
        if (!isSelected) { e.stopPropagation(); onSelect(); return; }
        handlePointerDown(e, 'move');
      }}
    >
      <div data-text-content style={{ pointerEvents: isSelected ? 'none' : 'auto', userSelect: 'none', transition: 'none' }}>
        {children}
      </div>

      {isSelected && (
        <>
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ border: '1.5px solid hsl(var(--primary))', borderRadius: 1 }}
          />

          {hasToolbar && (
            <div
              className="absolute flex items-center gap-0.5 pointer-events-auto"
              style={{
                bottom: '100%',
                left: '50%',
                transform: 'translateX(-50%)',
                marginBottom: 6,
                background: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 6,
                padding: '2px 4px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                zIndex: 30,
              }}
            >
              {onCopy && (
                <ToolbarButton
                  icon={<Copy className="h-3.5 w-3.5" />}
                  title="Copy"
                  onClick={onCopy}
                />
              )}
              {onReset && (
                <ToolbarButton
                  icon={<RotateCcw className="h-3.5 w-3.5" />}
                  title="Reset"
                  onClick={onReset}
                />
              )}
              {onDuplicate && (
                <ToolbarButton
                  icon={<CopyPlus className="h-3.5 w-3.5" />}
                  title="Duplicate"
                  onClick={onDuplicate}
                />
              )}
              {onDelete && (
                <ToolbarButton
                  icon={<Trash2 className="h-3.5 w-3.5" />}
                  title="Delete"
                  onClick={onDelete}
                />
              )}
            </div>
          )}

          {canResize && (
            <>
              <Handle
                style={{ left: -HALF, top: -HALF, cursor: 'nwse-resize' }}
                onPointerDown={(e) => handlePointerDown(e, 'fontsize-tl')}
              />
              <Handle
                style={{ right: -HALF, top: -HALF, cursor: 'nesw-resize' }}
                onPointerDown={(e) => handlePointerDown(e, 'fontsize-tr')}
              />
              <Handle
                style={{ left: -HALF, top: '50%', transform: 'translateY(-50%)', cursor: 'ew-resize' }}
                onPointerDown={(e) => handlePointerDown(e, 'resize-left')}
              />
              <Handle
                style={{ right: -HALF, top: '50%', transform: 'translateY(-50%)', cursor: 'ew-resize' }}
                onPointerDown={(e) => handlePointerDown(e, 'resize-right')}
              />
              <Handle
                style={{ left: -HALF, bottom: -HALF, cursor: 'nesw-resize' }}
                onPointerDown={(e) => handlePointerDown(e, 'fontsize-bl')}
              />
              <Handle
                style={{ right: -HALF, bottom: -HALF, cursor: 'nwse-resize' }}
                onPointerDown={(e) => handlePointerDown(e, 'fontsize-br')}
              />
            </>
          )}

          <div
            className="absolute flex flex-col items-center pointer-events-auto"
            style={{
              top: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              marginTop: 6,
              zIndex: 30,
            }}
          >
            <div className="flex items-center gap-1">
              <div
                className="flex items-center justify-center rounded-full"
                style={{
                  width: 24,
                  height: 24,
                  background: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
                  cursor: 'move',
                  color: 'hsl(var(--muted-foreground))',
                }}
                onPointerDown={(e) => handlePointerDown(e, 'move')}
              >
                <Move className="h-3 w-3" />
              </div>

              {showRotateHandle && onRotate && (
                <div
                  className="flex items-center justify-center rounded-full"
                  style={{
                    width: 24,
                    height: 24,
                    background: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
                    cursor: 'grab',
                    color: 'hsl(var(--muted-foreground))',
                  }}
                  onPointerDown={(e) => handlePointerDown(e, 'rotate')}
                >
                  <RotateCw className="h-3 w-3" />
                </div>
              )}
            </div>

            {isRotating && liveAngle !== null && (
              <div
                className="mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium tabular-nums"
                style={{
                  background: 'hsl(var(--primary))',
                  color: 'hsl(var(--primary-foreground))',
                  whiteSpace: 'nowrap',
                  lineHeight: 1.2,
                }}
              >
                {displayAngle}°
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

const ToolbarButton: React.FC<{
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
}> = ({ icon, title, onClick }) => (
  <button
    title={title}
    className="flex items-center justify-center rounded p-1 hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
    style={{ width: 26, height: 26 }}
    onClick={(e) => { e.stopPropagation(); onClick(); }}
    onPointerDown={(e) => e.stopPropagation()}
  >
    {icon}
  </button>
);

const Handle: React.FC<{
  style: React.CSSProperties;
  onPointerDown: (e: React.PointerEvent) => void;
}> = ({ style: extra, onPointerDown }) => (
  <div
    className="absolute bg-primary border border-primary-foreground"
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
