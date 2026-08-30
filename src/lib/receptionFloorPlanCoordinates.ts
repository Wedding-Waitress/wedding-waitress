export interface ReceptionCanvasMetrics {
  scale: number;
  originX: number;
  originY: number;
}

export interface ReceptionRoomPoint {
  x: number;
  y: number;
}

export interface ReceptionLandscapePresentation {
  canonicalWidth: number;
  canonicalHeight: number;
  displayWidth: number;
  displayHeight: number;
}

export interface ReceptionCanvasMetricInput {
  rectLeft: number;
  rectTop: number;
  rectWidth: number;
  offsetWidth: number;
  clientLeft: number;
  clientTop: number;
}

export const getReceptionCanvasMetrics = ({
  rectLeft,
  rectTop,
  rectWidth,
  offsetWidth,
  clientLeft,
  clientTop,
}: ReceptionCanvasMetricInput): ReceptionCanvasMetrics => {
  const scale = offsetWidth > 0 ? rectWidth / offsetWidth : 1;
  return {
    scale,
    originX: rectLeft + clientLeft * scale,
    originY: rectTop + clientTop * scale,
  };
};

export const clientPointToReceptionRoom = (
  clientX: number,
  clientY: number,
  metrics: ReceptionCanvasMetrics,
  pixelsPerMetre: number,
  presentation?: ReceptionLandscapePresentation,
) => ({
  ...receptionLandscapePointToRoom(
    {
      x: (clientX - metrics.originX) / (pixelsPerMetre * metrics.scale),
      y: (clientY - metrics.originY) / (pixelsPerMetre * metrics.scale),
    },
    presentation,
  ),
});

export const createReceptionLandscapePresentation = (
  canonicalWidth: number,
  canonicalHeight: number,
): ReceptionLandscapePresentation => ({
  canonicalWidth,
  canonicalHeight,
  displayWidth: canonicalHeight,
  displayHeight: canonicalWidth,
});

/**
 * Rotates only the Reception document's presentation coordinate system.
 * Canonical room coordinates remain width-first (x) and length-first (y).
 */
export const receptionRoomPointToLandscape = (
  point: ReceptionRoomPoint,
  presentation: ReceptionLandscapePresentation,
): ReceptionRoomPoint => ({
  x: point.y,
  y: presentation.canonicalWidth - point.x,
});

/** Exact inverse of receptionRoomPointToLandscape for pointer and drop events. */
export const receptionLandscapePointToRoom = (
  point: ReceptionRoomPoint,
  presentation?: ReceptionLandscapePresentation,
): ReceptionRoomPoint => presentation
  ? {
      x: presentation.canonicalWidth - point.y,
      y: point.x,
    }
  : point;

export const receptionRoomPolygonToLandscape = <T extends { x: number; y: number }>(
  points: T[],
  presentation: ReceptionLandscapePresentation,
) => points.map((point) => receptionRoomPointToLandscape(point, presentation));
