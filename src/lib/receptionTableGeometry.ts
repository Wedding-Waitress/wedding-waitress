import type { ReceptionTable, ReceptionTableType } from '@/hooks/useReceptionTables';
import { headTableMinimumWidthM } from '@/lib/headTable';

export interface ReceptionTableDimensions {
  width: number;
  height: number;
}

const TABLE_DIMENSIONS: Record<ReceptionTableType, ReceptionTableDimensions> = {
  round: { width: 1.8, height: 1.8 },
  square: { width: 1.8, height: 1.8 },
  long: { width: 3.2, height: 1.2 },
};

export const getReceptionTableDimensions = (
  type: ReceptionTableType | null | undefined,
): ReceptionTableDimensions => TABLE_DIMENSIONS[type ?? 'round'] ?? TABLE_DIMENSIONS.round;

export const getHeadTableDimensions = (capacity: number): ReceptionTableDimensions => ({
  width: headTableMinimumWidthM(capacity),
  height: 1.1,
});

export interface ReceptionChairPoint {
  x: number;
  y: number;
}

export const getReceptionChairPoints = (
  type: ReceptionTableType,
  capacity: number,
  widthPx: number,
  heightPx: number,
  chairSizePx: number,
): ReceptionChairPoint[] => {
  if (capacity <= 0) return [];
  const halfChair = chairSizePx / 2;
  const gap = 11;

  if (type === 'round') {
    const radiusX = widthPx / 2 + gap;
    const radiusY = heightPx / 2 + gap;
    return Array.from({ length: capacity }, (_, index) => {
      const angle = (index / capacity) * Math.PI * 2 - Math.PI / 2;
      return {
        x: widthPx / 2 + Math.cos(angle) * radiusX - halfChair,
        y: heightPx / 2 + Math.sin(angle) * radiusY - halfChair,
      };
    });
  }

  const outerWidth = widthPx + gap * 2;
  const outerHeight = heightPx + gap * 2;
  const perimeter = 2 * (outerWidth + outerHeight);
  return Array.from({ length: capacity }, (_, index) => {
    let distance = ((index + 0.5) / capacity) * perimeter;
    let x = -gap;
    let y = -gap;
    if (distance <= outerWidth) {
      x += distance;
    } else if ((distance -= outerWidth) <= outerHeight) {
      x += outerWidth;
      y += distance;
    } else if ((distance -= outerHeight) <= outerWidth) {
      x += outerWidth - distance;
      y += outerHeight;
    } else {
      distance -= outerWidth;
      y += outerHeight - distance;
    }
    return { x: x - halfChair, y: y - halfChair };
  });
};

export const getHeadTableChairPoints = (
  capacity: number,
  widthPx: number,
  heightPx: number,
  chairSizePx: number,
): ReceptionChairPoint[] => {
  if (capacity <= 0) return [];
  const gap = 10;
  const halfChair = chairSizePx / 2;
  const usableHeight = Math.max(chairSizePx, heightPx - chairSizePx * 0.7);
  return Array.from({ length: capacity }, (_, index) => ({
    x: widthPx + gap - halfChair,
    y: heightPx / 2 - usableHeight / 2 + ((index + 0.5) / capacity) * usableHeight - halfChair,
  }));
};

export const isReceptionChairOccupied = (
  index: number,
  occupiedCount: number,
  occupiedSeatNumbers: number[],
): boolean => {
  const seatNumber = index + 1;
  if (occupiedSeatNumbers.includes(seatNumber)) return true;
  if (occupiedSeatNumbers.length === 0) return index < occupiedCount;
  const remainingUnnumberedGuests = Math.max(0, occupiedCount - occupiedSeatNumbers.length);
  const unspecifiedRank = seatNumber - occupiedSeatNumbers.filter((seat) => seat <= seatNumber).length;
  return unspecifiedRank <= remainingUnnumberedGuests;
};
