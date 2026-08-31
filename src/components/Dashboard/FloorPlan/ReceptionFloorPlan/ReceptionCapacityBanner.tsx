import { useMemo } from 'react';
import { AlertTriangle, CheckCircle2, Users } from 'lucide-react';
import type { ReceptionTable } from '@/hooks/useReceptionTables';
import type { ReceptionFloorPlan } from '@/hooks/useReceptionFloorPlan';

interface Props {
  plan: ReceptionFloorPlan;
  tables: ReceptionTable[];
  attendingCount: number;
  compact?: boolean;
}

/**
 * Phase 1A — Step 5
 * Capacity banner: compares attending guests vs total seats across PLACED tables.
 * Also flags unplaced tables.
 */
export const ReceptionCapacityBanner = ({ plan, tables, attendingCount, compact = false }: Props) => {
  const stats = useMemo(() => {
    const placedIds = new Set([
      ...plan.table_positions.map((p) => p.table_id),
      ...plan.fixtures.flatMap((fixture) => fixture.linked_table_id ? [fixture.linked_table_id] : []),
    ]);
    const placedTables = tables.filter((t) => placedIds.has(t.id));
    const placedSeats = placedTables.reduce((sum, t) => sum + (t.limit_seats || 0), 0);
    const totalSeats = tables.reduce((sum, t) => sum + (t.limit_seats || 0), 0);
    const unplacedCount = tables.length - placedTables.length;
    return {
      placedTablesCount: placedTables.length,
      totalTablesCount: tables.length,
      placedSeats,
      totalSeats,
      unplacedCount,
    };
  }, [plan.fixtures, plan.table_positions, tables]);

  const overCapacity = attendingCount > stats.placedSeats;
  const undersized = attendingCount > stats.totalSeats;
  const allPlaced = stats.unplacedCount === 0 && stats.totalTablesCount > 0;

  let tone: 'good' | 'warn' | 'bad' = 'good';
  if (overCapacity) tone = 'warn';
  if (undersized) tone = 'bad';

  const toneClasses =
    tone === 'bad'
      ? 'border-destructive/40 bg-destructive/5 text-destructive'
      : tone === 'warn'
      ? 'border-amber-400/50 bg-amber-50 text-amber-800'
      : 'border-green-500/40 bg-green-50 text-green-800';

  const Icon = tone === 'good' ? CheckCircle2 : AlertTriangle;

  return (
    <div data-reception-status={tone} data-compact={compact || undefined} className={`rounded-lg border p-3 flex flex-wrap items-center gap-3 ${toneClasses}`}>
      <Icon className="w-5 h-5 shrink-0" />

      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
        <Stat
          icon={<Users className="w-3.5 h-3.5" />}
          label="Attending"
          value={attendingCount}
        />
        <Stat
          label="Placed seats"
          value={`${stats.placedSeats} / ${stats.totalSeats}`}
        />
        <Stat
          label="Tables placed"
          value={`${stats.placedTablesCount} / ${stats.totalTablesCount}`}
        />
      </div>

      <div className={`${compact ? 'w-full' : 'ml-auto'} text-xs sm:text-sm font-medium`}>
        {undersized && (
          <span>
            Not enough seats in total — add {attendingCount - stats.totalSeats} more on the Tables page.
          </span>
        )}
        {!undersized && overCapacity && (
          <span>
            Place {attendingCount - stats.placedSeats} more seat
            {attendingCount - stats.placedSeats === 1 ? '' : 's'} into the room.
          </span>
        )}
        {!undersized && !overCapacity && allPlaced && (
          <span>All tables placed · room covers every attending guest.</span>
        )}
        {!undersized && !overCapacity && !allPlaced && stats.totalTablesCount > 0 && (
          <span>
            {stats.unplacedCount} table{stats.unplacedCount === 1 ? '' : 's'} still in the palette.
          </span>
        )}
        {stats.totalTablesCount === 0 && (
          <span>Add tables on the Tables page to start placing them.</span>
        )}
      </div>
    </div>
  );
};

const Stat = ({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string | number;
}) => (
  <div className="flex items-center gap-1.5">
    {icon}
    <span className="opacity-80">{label}:</span>
    <span className="font-semibold">{value}</span>
  </div>
);
