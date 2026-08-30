import type { ReceptionFloorPlan, TablePosition } from '@/hooks/useReceptionFloorPlan';
import type { ReceptionTable } from '@/hooks/useReceptionTables';
import { getHeadTableDimensions } from '@/lib/receptionTableGeometry';
import { autoArrangeReception } from '@/lib/receptionAutoLayout';

const snapshot = (position: TablePosition, table: ReceptionTable): TablePosition => {
  const headDimensions = table.table_purpose === 'head' ? getHeadTableDimensions(table.limit_seats) : null;
  return {
    ...position,
    table_name: table.name,
    table_no: table.table_no,
    table_type: table.table_type,
    table_purpose: table.table_purpose,
    head_seating_order: table.head_seating_order,
    capacity: table.limit_seats,
    occupied_count: table.guest_count,
    occupied_seat_numbers: table.occupied_seat_numbers,
    width_m: table.table_purpose === 'head' ? Math.max(position.width_m ?? 0, headDimensions!.width) : undefined,
    height_m: table.table_purpose === 'head' ? Math.max(position.height_m ?? 0, headDimensions!.height) : undefined,
  };
};

export const reconcileReceptionFloorPlan = (
  plan: ReceptionFloorPlan,
  authoritativeTables: ReceptionTable[],
): ReceptionFloorPlan => {
  const tableById = new Map(authoritativeTables.map((table) => [table.id, table]));
  const headTable = authoritativeTables.find((table) => table.table_purpose === 'head') ?? null;
  const headAlreadyPlaced = !!headTable && plan.table_positions.some((position) => position.table_id === headTable.id);
  const legacyBridalFixtures = plan.fixtures.filter((fixture) => fixture.type === 'bridal_table');
  const safelyRetireLegacy = !!headTable && legacyBridalFixtures.length === 1;
  const safelyTransferLegacy = safelyRetireLegacy && !headAlreadyPlaced;

  const seen = new Set<string>();
  const kept = plan.table_positions.flatMap((position) => {
    const table = tableById.get(position.table_id);
    if (!table || seen.has(table.id)) return [];
    seen.add(table.id);
    return [snapshot(position, table)];
  });

  if (safelyTransferLegacy && headTable) {
    const legacy = legacyBridalFixtures[0];
    kept.push(snapshot({
      table_id: headTable.id,
      x: legacy.x,
      y: legacy.y,
      rotation: legacy.rotation,
      locked: legacy.locked,
      width_m: legacy.width_m,
      height_m: legacy.height_m,
    }, headTable));
  }

  const arranged = autoArrangeReception(
    { ...plan, table_positions: kept },
    authoritativeTables,
    { preserveExisting: true },
  );
  const tablePositions = arranged.positions.map((position) => {
    const table = tableById.get(position.table_id);
    return table ? snapshot(position, table) : position;
  });
  const fixtures = safelyRetireLegacy
    ? plan.fixtures.filter((fixture) => fixture.id !== legacyBridalFixtures[0].id)
    : plan.fixtures;

  const next = { ...plan, table_positions: tablePositions, fixtures };
  return JSON.stringify([plan.table_positions, plan.fixtures]) === JSON.stringify([next.table_positions, next.fixtures])
    ? plan
    : next;
};
