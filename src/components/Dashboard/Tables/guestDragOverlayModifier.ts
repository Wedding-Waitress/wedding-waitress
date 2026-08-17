import type { Modifier } from '@dnd-kit/core';
import { getEventCoordinates, isTouchEvent } from '@dnd-kit/utilities';

export const POINTER_OVERLAY_GAP = 10;
export const TOUCH_OVERLAY_GAP = 28;

/**
 * Keeps the guest preview centred immediately above the live pointer.
 * All values are viewport-relative; document scroll offsets must not be added.
 */
export const alignGuestOverlayAbovePointer: Modifier = ({
  activatorEvent,
  activeNodeRect,
  overlayNodeRect,
  transform,
}) => {
  if (!activatorEvent || !activeNodeRect) return transform;

  const activatorCoordinates = getEventCoordinates(activatorEvent);
  if (!activatorCoordinates) return transform;

  const overlayRect = overlayNodeRect ?? activeNodeRect;
  const pointerType = 'pointerType' in activatorEvent
    ? (activatorEvent as PointerEvent).pointerType
    : null;
  const gap = isTouchEvent(activatorEvent) || pointerType === 'touch'
    ? TOUCH_OVERLAY_GAP
    : POINTER_OVERLAY_GAP;

  return {
    ...transform,
    x: transform.x + activatorCoordinates.x - activeNodeRect.left - overlayRect.width / 2,
    y: transform.y + activatorCoordinates.y - activeNodeRect.top - overlayRect.height - gap,
  };
};
