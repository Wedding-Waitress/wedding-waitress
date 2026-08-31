/**
 * Reception Floor Plan — deterministic auto-arrange helper.
 * Pure function: no AI calls, fully predictable.
 */
import type {
  ReceptionFloorPlan,
  TablePosition,
  Fixture,
} from '@/hooks/useReceptionFloorPlan';
import type { ReceptionTable } from '@/hooks/useReceptionTables';
import { aabbInsidePolygon, rectPolygon } from '@/lib/floorPlanShapes';
import { getHeadTableDimensions, getReceptionTableDimensions } from '@/lib/receptionTableGeometry';

const tableRadiusM = (table: ReceptionTable) => {
  const dimensions = table.table_purpose === 'head'
    ? getHeadTableDimensions(table.limit_seats)
    : getReceptionTableDimensions(table.table_type);
  return Math.hypot(dimensions.width, dimensions.height) / 2 + 0.45;
};

const fixtureFootprint = (f: Fixture) => ({
  x: f.x,
  y: f.y,
  w: f.width_m + 0.6,
  h: f.height_m + 0.6,
});

const collidesRectCircle = (
  rx: number, ry: number, rw: number, rh: number,
  cx: number, cy: number, r: number
) => {
  const left = rx - rw / 2;
  const right = rx + rw / 2;
  const top = ry - rh / 2;
  const bottom = ry + rh / 2;
  const dx = Math.max(left - cx, 0, cx - right);
  const dy = Math.max(top - cy, 0, cy - bottom);
  return dx * dx + dy * dy < r * r;
};

export interface AutoLayoutResult {
  positions: TablePosition[];
  placed: number;
  skipped: number;
}

export const autoArrangeReception = (
  plan: ReceptionFloorPlan,
  tables: ReceptionTable[],
  options: { preserveExisting?: boolean } = {},
): AutoLayoutResult => {
  const poly =
    plan.room_polygon && plan.room_polygon.points.length > 2
      ? plan.room_polygon
      : rectPolygon(plan.room_width_m, plan.room_length_m);

  const kept = options.preserveExisting
    ? [...plan.table_positions]
    : plan.table_positions.filter((p) => p.locked);
  const lockedIds = new Set(kept.map((p) => p.table_id));
  const unlockedPositions = options.preserveExisting
    ? []
    : plan.table_positions.filter((p) => !p.locked);

  const candidateIds = new Set<string>([
    ...unlockedPositions.map((p) => p.table_id),
    ...tables.filter((t) => !kept.some((p) => p.table_id === t.id)).map((t) => t.id),
  ]);
  for (const id of lockedIds) candidateIds.delete(id);

  const candidates = tables.filter((t) => candidateIds.has(t.id));
  candidates.sort((a, b) => (b.limit_seats || 0) - (a.limit_seats || 0));

  const fixtures = plan.fixtures.map(fixtureFootprint);
  const result: TablePosition[] = [...kept];

  const avgR = candidates.length
    ? candidates.reduce((s, t) => s + tableRadiusM(t), 0) / candidates.length
    : 1.2;
  const step = Math.max(1.4, avgR * 2 + 0.4);
  const margin = 0.6;

  const cellFits = (cx: number, cy: number, r: number) => {
    if (!aabbInsidePolygon(cx, cy, r * 2, r * 2, poly)) return false;
    for (const f of fixtures) {
      if (collidesRectCircle(f.x, f.y, f.w, f.h, cx, cy, r)) return false;
    }
    for (const p of result) {
      const t = tables.find((tt) => tt.id === p.table_id);
      const r2 = t ? tableRadiusM(t) : 1.4;
      const dx = cx - p.x;
      const dy = cy - p.y;
      const min = r + r2 + 0.3;
      if (dx * dx + dy * dy < min * min) return false;
    }
    return true;
  };

  for (const t of candidates) {
    const r = tableRadiusM(t);
    let placed = false;
    for (let y = margin + r; y <= plan.room_length_m - margin - r && !placed; y += step) {
      for (let x = margin + r; x <= plan.room_width_m - margin - r && !placed; x += step) {
        if (cellFits(x, y, r)) {
          result.push({ table_id: t.id, x, y, rotation: 0, locked: false });
          placed = true;
        }
      }
    }
  }

  return {
    positions: result,
    placed: result.length - kept.length,
    skipped: candidates.length - (result.length - kept.length),
  };
};
