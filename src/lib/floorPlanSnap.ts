/**
 * Phase 2B — Snap math for the Reception Floor Plan canvas.
 * Pure functions; no DOM. All units in meters.
 */
export interface SnapTarget {
  /** Axis the target lives on. */
  axis: 'x' | 'y';
  /** Value in meters along that axis. */
  value: number;
}

export interface SnapResult {
  x: number;
  y: number;
  /** Snapped axes for guide rendering. */
  guides: SnapTarget[];
}

export interface SnapInput {
  x: number;
  y: number;
  /** Snap candidates (room walls, centerlines, grid, other items). */
  targetsX: number[];
  targetsY: number[];
  /** Max snap distance in meters. */
  threshold: number;
}

export const snapPoint = (input: SnapInput): SnapResult => {
  const guides: SnapTarget[] = [];
  let bestX = input.x;
  let bestY = input.y;
  let bestDX = input.threshold;
  let bestDY = input.threshold;

  for (const t of input.targetsX) {
    const d = Math.abs(input.x - t);
    if (d <= bestDX) {
      bestDX = d;
      bestX = t;
    }
  }
  for (const t of input.targetsY) {
    const d = Math.abs(input.y - t);
    if (d <= bestDY) {
      bestDY = d;
      bestY = t;
    }
  }
  if (bestX !== input.x) guides.push({ axis: 'x', value: bestX });
  if (bestY !== input.y) guides.push({ axis: 'y', value: bestY });
  return { x: bestX, y: bestY, guides };
};

export interface RoomSnapContext {
  width: number;
  height: number;
  gridSizeM: number;
  extraTargetsX?: number[];
  extraTargetsY?: number[];
}

export const buildRoomSnapTargets = (
  ctx: RoomSnapContext,
  near: { x: number; y: number },
  threshold: number
): { targetsX: number[]; targetsY: number[] } => {
  const targetsX: number[] = [0, ctx.width, ctx.width / 2];
  const targetsY: number[] = [0, ctx.height, ctx.height / 2];

  // Grid lines within ±threshold of the candidate value (keeps array small)
  if (ctx.gridSizeM > 0.05) {
    const startX = Math.max(0, Math.floor((near.x - threshold) / ctx.gridSizeM)) * ctx.gridSizeM;
    const endX = Math.min(ctx.width, near.x + threshold);
    for (let v = startX; v <= endX + 1e-6; v += ctx.gridSizeM) targetsX.push(v);
    const startY = Math.max(0, Math.floor((near.y - threshold) / ctx.gridSizeM)) * ctx.gridSizeM;
    const endY = Math.min(ctx.height, near.y + threshold);
    for (let v = startY; v <= endY + 1e-6; v += ctx.gridSizeM) targetsY.push(v);
  }

  if (ctx.extraTargetsX) targetsX.push(...ctx.extraTargetsX);
  if (ctx.extraTargetsY) targetsY.push(...ctx.extraTargetsY);
  return { targetsX, targetsY };
};
