/**
 * Phase 2C — Room shape helpers.
 * All coordinates are meters from the room's top-left bounding box.
 */
import type { RoomPolygon, RoomShapeKind } from '@/hooks/useReceptionFloorPlan';

export interface Pt {
  x: number;
  y: number;
}

export const rectPolygon = (w: number, h: number): RoomPolygon => ({
  kind: 'rect',
  points: [
    { x: 0, y: 0 },
    { x: w, y: 0 },
    { x: w, y: h },
    { x: 0, y: h },
  ],
});

/** L-shape: full width × full height with a notch cut from the bottom-right. */
export const lShapePolygon = (
  w: number,
  h: number,
  notchW: number,
  notchH: number
): RoomPolygon => ({
  kind: 'L',
  points: [
    { x: 0, y: 0 },
    { x: w, y: 0 },
    { x: w, y: h - notchH },
    { x: w - notchW, y: h - notchH },
    { x: w - notchW, y: h },
    { x: 0, y: h },
  ],
});

/** T-shape: top bar full width, vertical stem centered. */
export const tShapePolygon = (
  w: number,
  h: number,
  topBarH: number,
  stemW: number
): RoomPolygon => {
  const stemX1 = (w - stemW) / 2;
  const stemX2 = stemX1 + stemW;
  return {
    kind: 'T',
    points: [
      { x: 0, y: 0 },
      { x: w, y: 0 },
      { x: w, y: topBarH },
      { x: stemX2, y: topBarH },
      { x: stemX2, y: h },
      { x: stemX1, y: h },
      { x: stemX1, y: topBarH },
      { x: 0, y: topBarH },
    ],
  };
};

export const polygonToSvgPath = (poly: RoomPolygon, pxPerM: number): string => {
  if (!poly.points.length) return '';
  return (
    poly.points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x * pxPerM} ${p.y * pxPerM}`)
      .join(' ') + ' Z'
  );
};

export const polygonBounds = (poly: RoomPolygon): { w: number; h: number } => {
  let maxX = 0;
  let maxY = 0;
  for (const p of poly.points) {
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { w: maxX, h: maxY };
};

export const ROOM_SHAPE_OPTIONS: { value: RoomShapeKind; label: string }[] = [
  { value: 'rect', label: 'Rectangle' },
  { value: 'L', label: 'L-shape' },
  { value: 'T', label: 'T-shape' },
  { value: 'custom', label: 'Custom polygon' },
];

/** Ray-cast point-in-polygon. Polygon must be a simple closed polygon. */
export const pointInPolygon = (pt: Pt, poly: RoomPolygon): boolean => {
  const pts = poly.points;
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i].x, yi = pts[i].y;
    const xj = pts[j].x, yj = pts[j].y;
    const intersect =
      yi > pt.y !== yj > pt.y &&
      pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi + 1e-9) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
};

/** Quick check: a centered AABB (width/height in meters) fits inside the polygon. */
export const aabbInsidePolygon = (
  cx: number,
  cy: number,
  w: number,
  h: number,
  poly: RoomPolygon
): boolean => {
  const corners: Pt[] = [
    { x: cx - w / 2, y: cy - h / 2 },
    { x: cx + w / 2, y: cy - h / 2 },
    { x: cx + w / 2, y: cy + h / 2 },
    { x: cx - w / 2, y: cy + h / 2 },
  ];
  return corners.every((c) => pointInPolygon(c, poly));
};
