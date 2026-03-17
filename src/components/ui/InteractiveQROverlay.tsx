import React, { useRef, useCallback, useState } from 'react';
import { Trash2, RotateCcw, CopyPlus, Move, RotateCw } from 'lucide-react';

interface InteractiveQROverlayProps {
  qrDataUrl: string;
  xPercent: number;
  yPercent: number;
  sizePercent: number;
  rotation?: number;
  isSelected: boolean;
  onSelect: () => void;
  onMove: (xPercent: number, yPercent: number) => void;
  onResize: (sizePercent: number) => void;
  onDelete: () => void;
  onReset?: () => void;
  onDuplicate?: () => void;
  onRotate?: (rotation: number) => void;
  containerRef: React.RefObject<HTMLElement>;
}

const SNAP_THRESHOLD = 4;

export const InteractiveQROverlay: React.FC<InteractiveQROverlayProps> = ({
  qrDataUrl,
  xPercent,
  yPercent,
  sizePercent,
  rotation = 0,
  isSelected,
  onSelect,
  onMove,
  onResize,
  onDelete,
  onReset,
  onDuplicate,
  onRotate,
  containerRef,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [liveAngle, setLiveAngle] = useState<number | null>(null);
  const dragStartRef = useRef<{ startX: number; startY: number; origXP: number; origYP: number } | null>(null);
  const resizeStartRef = useRef<{ startX: number; startY: number; origSize: number; corner: string } | null>(null);
  const rotateStartRef = useRef<{ startX: number; origRotation: number } | null>(null);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onSelect();
    const container = containerRef.current;
    if (!container) return;
    setIsDragging(true);
    dragStartRef.current = { startX: e.clientX, startY: e.clientY, origXP: xPercent, origYP: yPercent };
    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);
  }, [xPercent, yPercent, onSelect, containerRef]);

  const handleMoveDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = { startX: e.clientX, startY: e.clientY, origXP: xPercent, origYP: yPercent };
    const overlay = (e.currentTarget as HTMLElement).closest('[data-qr-overlay]') as HTMLElement;
    if (overlay) overlay.setPointerCapture(e.pointerId);
  }, [xPercent, yPercent]);

  const handleRotateDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsRotating(true);
    setLiveAngle(rotation);
    rotateStartRef.current = { startX: e.clientX, origRotation: rotation };
    dragStartRef.current = null;
    resizeStartRef.current = null;
    const overlay = (e.currentTarget as HTMLElement).closest('[data-qr-overlay]') as HTMLElement;
    if (overlay) overlay.setPointerCapture(e.pointerId);
  }, [rotation]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (dragStartRef.current && isDragging) {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const dx = ((e.clientX - dragStartRef.current.startX) / rect.width) * 100;
      const dy = ((e.clientY - dragStartRef.current.startY) / rect.height) * 100;
      onMove(
        Math.max(0, Math.min(100, dragStartRef.current.origXP + dx)),
        Math.max(0, Math.min(100, dragStartRef.current.origYP + dy)),
      );
    }
    if (resizeStartRef.current) {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const corner = resizeStartRef.current.corner;
      const dx = ((e.clientX - resizeStartRef.current.startX) / rect.width) * 100;
      const dy = ((e.clientY - resizeStartRef.current.startY) / rect.height) * 100;
      const isRight = corner.includes('r');
      const isBottom = corner.includes('b');
      const delta = (isRight ? dx : -dx) + (isBottom ? dy : -dy);
      onResize(Math.max(5, Math.min(40, resizeStartRef.current.origSize + delta / 2)));
    }
    if (rotateStartRef.current && isRotating && onRotate) {
      const dx = e.clientX - rotateStartRef.current.startX;
      let newAngle = rotateStartRef.current.origRotation + dx * 0.5;
      // Snap to zero
      if (Math.abs(newAngle) < SNAP_THRESHOLD) newAngle = 0;
      // Clamp to -180..180
      newAngle = Math.max(-180, Math.min(180, Math.round(newAngle)));
      setLiveAngle(newAngle);
      onRotate(newAngle);
    }
  }, [isDragging, isRotating, containerRef, onMove, onResize, onRotate]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    setIsDragging(false);
    setIsRotating(false);
    setLiveAngle(null);
    dragStartRef.current = null;
    resizeStartRef.current = null;
    rotateStartRef.current = null;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  }, []);

  const handleCornerDown = useCallback((e: React.PointerEvent, corner: string) => {
    e.stopPropagation();
    e.preventDefault();
    resizeStartRef.current = { startX: e.clientX, startY: e.clientY, origSize: sizePercent, corner };
    dragStartRef.current = null;
    rotateStartRef.current = null;
    const el = e.currentTarget.closest('[data-qr-overlay]') as HTMLElement;
    if (el) el.setPointerCapture(e.pointerId);
  }, [sizePercent]);

  const half = sizePercent / 2;
  const left = xPercent - half;
  const top = yPercent - half;

  const displayAngle = liveAngle !== null ? (liveAngle > 0 ? `+${liveAngle}` : `${liveAngle}`) : '';

  const hasToolbar = onReset || onDuplicate || onDelete;

  return (
    <div
      data-qr-overlay
      className="absolute"
      style={{
        left: `${left}%`,
        top: `${top}%`,
        width: `${sizePercent}%`,
        aspectRatio: '1',
        zIndex: isSelected ? 40 : 20,
        cursor: isDragging ? 'grabbing' : 'grab',
        transform: `rotate(${rotation}deg)`,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
    >
      <img
        src={qrDataUrl}
        alt="QR Code"
        className="w-full h-full pointer-events-none select-none"
        draggable={false}
      />

      {isSelected && (
        <>
          {/* Selection border */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ border: '1.5px solid hsl(var(--primary))', borderRadius: 1 }}
          />

          {/* Top toolbar: Reset, Duplicate, Delete */}
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

          {/* Corner resize handles */}
          {['tl', 'tr', 'bl', 'br'].map(corner => {
            const isTop = corner.includes('t');
            const isLeft = corner.includes('l');
            return (
              <div
                key={corner}
                className="absolute w-3 h-3 bg-primary border border-primary-foreground rounded-sm"
                style={{
                  top: isTop ? -6 : 'auto',
                  bottom: isTop ? 'auto' : -6,
                  left: isLeft ? -6 : 'auto',
                  right: isLeft ? 'auto' : -6,
                  cursor: (corner === 'tl' || corner === 'br') ? 'nwse-resize' : 'nesw-resize',
                  zIndex: 50,
                }}
                onPointerDown={(e) => handleCornerDown(e, corner)}
              />
            );
          })}

          {/* Bottom controls: Move + Rotate */}
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
                onPointerDown={handleMoveDown}
              >
                <Move className="h-3 w-3" />
              </div>

              {onRotate && (
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
                  onPointerDown={handleRotateDown}
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
