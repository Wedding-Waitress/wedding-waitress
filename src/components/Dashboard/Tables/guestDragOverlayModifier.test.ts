import { describe, expect, it } from 'vitest';
import type { Modifier } from '@dnd-kit/core';
import {
  alignGuestOverlayAbovePointer,
  POINTER_OVERLAY_GAP,
  TOUCH_OVERLAY_GAP,
} from './guestDragOverlayModifier';

type ModifierArgs = Parameters<Modifier>[0];

const rect = (left: number, top: number, width: number, height: number) => ({
  left,
  top,
  right: left + width,
  bottom: top + height,
  width,
  height,
} as ModifierArgs['activeNodeRect']);

const applyAt = ({
  sourceTop,
  startX = 130,
  startY,
  deltaX = 0,
  deltaY = 0,
  pointerType = 'mouse',
}: {
  sourceTop: number;
  startX?: number;
  startY: number;
  deltaX?: number;
  deltaY?: number;
  pointerType?: 'mouse' | 'touch';
}) => {
  const activatorEvent = new MouseEvent('pointerdown', { clientX: startX, clientY: startY });
  Object.defineProperty(activatorEvent, 'pointerType', { value: pointerType });
  const activeNodeRect = rect(100, sourceTop, 220, 26);
  const overlayNodeRect = rect(100, sourceTop, 220, 26);
  const transform = { x: deltaX, y: deltaY, scaleX: 1, scaleY: 1 };

  const result = alignGuestOverlayAbovePointer({
    activatorEvent,
    active: null,
    activeNodeRect,
    draggingNodeRect: overlayNodeRect,
    containerNodeRect: null,
    over: null,
    overlayNodeRect,
    scrollableAncestors: [],
    scrollableAncestorRects: [],
    transform,
    windowRect: null,
  });

  return {
    result,
    overlayLeft: activeNodeRect!.left + result.x,
    overlayTop: activeNodeRect!.top + result.y,
    overlayWidth: overlayNodeRect!.width,
    overlayHeight: overlayNodeRect!.height,
    pointerX: startX + deltaX,
    pointerY: startY + deltaY,
  };
};

describe('alignGuestOverlayAbovePointer', () => {
  it.each([
    { name: 'top', sourceTop: 80, startY: 92, deltaY: 35 },
    { name: 'middle', sourceTop: 760, startY: 772, deltaY: -210 },
    { name: 'bottom after scrolling', sourceTop: -340, startY: 520, deltaY: 260 },
    { name: 'during upward auto-scroll', sourceTop: -900, startY: 640, deltaY: -420 },
  ])('keeps a constant cursor offset at the $name of the page', ({ sourceTop, startY, deltaY }) => {
    const position = applyAt({ sourceTop, startY, deltaX: 180, deltaY });

    expect(position.overlayLeft + position.overlayWidth / 2).toBe(position.pointerX);
    expect(position.pointerY - (position.overlayTop + position.overlayHeight)).toBe(POINTER_OVERLAY_GAP);
  });

  it('uses extra clearance above a touch point', () => {
    const position = applyAt({ sourceTop: 420, startY: 434, deltaY: 120, pointerType: 'touch' });

    expect(position.overlayLeft + position.overlayWidth / 2).toBe(position.pointerX);
    expect(position.pointerY - (position.overlayTop + position.overlayHeight)).toBe(TOUCH_OVERLAY_GAP);
  });

  it('does not alter keyboard transforms when no pointer coordinates exist', () => {
    const transform = { x: 12, y: -8, scaleX: 1, scaleY: 1 };
    const result = alignGuestOverlayAbovePointer({
      activatorEvent: new KeyboardEvent('keydown', { key: ' ' }),
      active: null,
      activeNodeRect: rect(0, 0, 100, 20),
      draggingNodeRect: null,
      containerNodeRect: null,
      over: null,
      overlayNodeRect: null,
      scrollableAncestors: [],
      scrollableAncestorRects: [],
      transform,
      windowRect: null,
    });

    expect(result).toEqual(transform);
  });
});
