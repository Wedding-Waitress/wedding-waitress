import React, { useRef, useCallback, useState } from 'react';
import { Trash2 } from 'lucide-react';

interface InteractiveQROverlayProps {
  qrDataUrl: string;
  xPercent: number;
  yPercent: number;
  sizePercent: number;
  isSelected: boolean;
  onSelect: () => void;
  onMove: (xPercent: number, yPercent: number) => void;
  onResize: (sizePercent: number) => void;
  onDelete: () => void;
  containerRef: React.RefObject<HTMLElement>;
}

export const InteractiveQROverlay: React.FC<InteractiveQROverlayProps> = ({
  qrDataUrl,
  xPercent,
  yPercent,
  sizePercent,
  isSelected,
  onSelect,
  onMove,
  onResize,
  onDelete,
  containerRef,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ startX: number; startY: number; origXP: number; origYP: number } | null>(null);
  const resizeStartRef = useRef<{ startX: number; startY: number; origSize: number; corner: string } | null>(null);

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
      // Use the larger absolute delta for proportional scaling
      const isRight = corner.includes('r');
      const isBottom = corner.includes('b');
      const delta = (isRight ? dx : -dx) + (isBottom ? dy : -dy);
      onResize(Math.max(5, Math.min(40, resizeStartRef.current.origSize + delta / 2)));
    }
  }, [isDragging, containerRef, onMove, onResize]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    setIsDragging(false);
    dragStartRef.current = null;
    resizeStartRef.current = null;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  }, []);

  const handleCornerDown = useCallback((e: React.PointerEvent, corner: string) => {
    e.stopPropagation();
    e.preventDefault();
    resizeStartRef.current = { startX: e.clientX, startY: e.clientY, origSize: sizePercent, corner };
    dragStartRef.current = null;
    const el = e.currentTarget.closest('[data-qr-overlay]') as HTMLElement;
    if (el) el.setPointerCapture(e.pointerId);
  }, [sizePercent]);

  const half = sizePercent / 2;
  const left = xPercent - half;
  const top = yPercent - half;

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
          <div className="absolute inset-0 border-2 border-primary rounded pointer-events-none" />

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

          {/* Delete button */}
          <button
            className="absolute -top-8 right-0 bg-destructive text-destructive-foreground rounded-full w-6 h-6 flex items-center justify-center shadow-sm hover:opacity-90 z-50"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            type="button"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </>
      )}
    </div>
  );
};
