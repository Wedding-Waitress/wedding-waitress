/**
 * ⚠️ PRODUCTION-READY - DO NOT MODIFY WITHOUT APPROVAL ⚠️
 * 
 * This Interactive Text Overlay component is COMPLETE and LOCKED.
 * It powers drag/move/resize/rotate for both Invitations and Place Cards editors.
 * All functionality has been thoroughly tested and approved.
 * 
 * DO NOT make changes unless explicitly requested by the project owner.
 * Any modifications could break the interactive text positioning system
 * across multiple features.
 * 
 * Last locked: 2026-03-18
 */

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
  /** Live callbacks fire DURING interaction for real-time mirroring to sibling elements */
  onLiveMove?: (dxPercent: number, dyPercent: number) => void;
  onLiveRotate?: (degrees: number) => void;
  onLiveFontSize?: (newSize: number) => void;
  onLiveEnd?: () => void;
  containerRef: React.RefObject<HTMLElement>;
  showResizeHandles?: boolean;
  showRotateHandle?: boolean;
  hideSideHandles?: boolean;
  rotation?: number;
  currentFontSize?: number;
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
  onLiveMove,
  onLiveRotate,
  onLiveFontSize,
  onLiveEnd,
  containerRef,
  showResizeHandles = true,
  showRotateHandle = true,
  hideSideHandles = false,
  rotation = 0,
  currentFontSize,
  className = '',
  style = {},
}) => {
  const elRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [liveAngle, setLiveAngle] = useState<number | null>(null);
  const [isCornerResizing, setIsCornerResizing] = useState(false);
  const [liveFontSize, setLiveFontSize] = useState<number | null>(null);
  const rafRef = useRef<number>(0);

  const getBaseTransform = useCallback((): string => {
    const t = (style.transform as string) || '';
    // Strip rotate AND translate(px) added during drag, but keep translate(-50%, -50%) centering
    return t.replace(/rotate\([^)]*\)/g, '').replace(/translate\([^)]*px[^)]*\)/g, '').trim();
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
    const baseWidth = el.getBoundingClientRect().width;
    const baseHeight = el.getBoundingClientRect().height;

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
      setLiveFontSize(currentFontSize ?? null);
    }

    const onPointerMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;

      if (mode === 'move') {
        accumX = dx;
        accumY = dy;
        el.style.transform = `${baseTransform} translate(${dx}px, ${dy}px) rotate(${rotation}deg)`;
        onDragMove?.({ x: dx, y: dy });
        // Emit live position delta as percentage for sibling mirroring
        if (onLiveMove) {
          const dxP = (dx / containerRect.width) * 100;
          const dyP = (dy / containerRect.height) * 100;
          onLiveMove(dxP, dyP);
        }
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
        const isTop = corner === 'tl' || corner === 'tr';
        const rawDx = isLeft ? -dx : dx;
        const rawDy = isTop ? -dy : dy;

        const newWidth = Math.max(50, baseWidth + (rawDx * 2));
        const newHeight = Math.max(50, baseHeight + (rawDy * 2));
        el.style.width = `${newWidth}px`;
        el.style.height = `${newHeight}px`;
        const newFontSize = Math.max(6, Math.min(200, (newWidth / baseWidth) * (currentFontSize || 24)));
        el.style.fontSize = `${newFontSize}px`;

        setLiveFontSize(Math.round(newFontSize));
        onLiveFontSize?.(Math.round(newFontSize));
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
        onLiveRotate?.(finalDeg);
      }
    };

    const onPointerUp = () => {
      setIsDragging(false);
      setIsRotating(false);
      setLiveAngle(null);
      setIsCornerResizing(false);
      setLiveFontSize(null);
      cancelAnimationFrame(rafRef.current);
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
      onLiveEnd?.();

      const rect = containerRect;

      if (mode === 'move' && onMove) {
        const dxP = (accumX / rect.width) * 100;
        const dyP = (accumY / rect.height) * 100;
        const newLeft = initLeft + dxP;
        const newTop = initTop + dyP;
        el.style.left = `${newLeft}%`;
        el.style.top = `${newTop}%`;
        // Restore base transform (e.g. translate(-50%,-50%)) plus rotation, without the drag px offset
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
        const roundedDelta = Math.round(lastFontDelta);
        if (onFontSizeChange && roundedDelta !== 0) {
          onFontSizeChange(roundedDelta);
        }
        // Clear inline overrides so React state takes over
        el.style.width = '';
        el.style.height = '';
        el.style.fontSize = '';
        el.style.transform = '';
        el.style.transformOrigin = '';
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
  }, [containerRef, onMove, onResize, onCornerResize, onFontSizeChange, onRotate, onDragMove, onDragEnd, onLiveMove, onLiveRotate, onLiveFontSize, onLiveEnd, rotation, getBaseTransform]);

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
              {!hideSideHandles && (
                <>
                  <Handle
                    style={{ left: -HALF, top: '50%', transform: 'translateY(-50%)', cursor: 'ew-resize' }}
                    onPointerDown={(e) => handlePointerDown(e, 'resize-left')}
                  />
                  <Handle
                    style={{ right: -HALF, top: '50%', transform: 'translateY(-50%)', cursor: 'ew-resize' }}
                    onPointerDown={(e) => handlePointerDown(e, 'resize-right')}
                  />
                </>
              )}
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

            {isCornerResizing && currentFontSize !== undefined && (
              <div
                className="mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium tabular-nums"
                style={{
                  background: 'hsl(var(--primary))',
                  color: 'hsl(var(--primary-foreground))',
                  whiteSpace: 'nowrap',
                  lineHeight: 1.2,
                }}
              >
                {liveFontSize}px
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
