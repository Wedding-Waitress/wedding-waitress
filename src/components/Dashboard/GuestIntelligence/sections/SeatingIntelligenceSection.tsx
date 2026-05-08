import { useMemo } from 'react';
import { MapPin } from 'lucide-react';
import IntelligenceSection from '../IntelligenceSection';
import InsightCard from '../InsightCard';
import EmptyHint from '../EmptyHint';
import { computeSeatingInsights, type TableLite } from '../lib/computeGuestInsights';
import type { Guest } from '@/hooks/useGuests';

export const SeatingIntelligenceSection = ({
  guests,
  tables,
}: {
  guests: Guest[];
  tables: TableLite[];
}) => {
  const ins = useMemo(() => computeSeatingInsights(guests, tables), [guests, tables]);
  const noTables = tables.length === 0;

  return (
    <IntelligenceSection
      value="seating"
      title="Seating Intelligence"
      description="Assignments and table capacity signals"
      icon={<MapPin className="w-4 h-4" />}
      badge={ins.unassigned > 0 ? `${ins.unassigned} unseated` : ''}
      badgeTone="warning"
    >
      {noTables ? (
        <EmptyHint>Create tables to unlock seating insights.</EmptyHint>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2.5 mb-3">
            <InsightCard label="Assigned" value={ins.assigned} tone="positive" />
            <InsightCard
              label="Unassigned"
              value={ins.unassigned}
              tone={ins.unassigned > 0 ? 'warning' : 'neutral'}
            />
            <InsightCard label="Empty Tables" value={ins.emptyTables} />
            <InsightCard
              label="Near Capacity"
              value={ins.nearCapacity.length}
              hint="≥ 90% seated"
              tone="info"
            />
          </div>
          {ins.overCapacity.length > 0 && (
            <div className="rounded-xl bg-[#FBECEC] border border-[#EBC9C9] px-3 py-2.5 text-[12px] text-[#8A1414] mb-3 leading-snug">
              Over-capacity:{' '}
              {ins.overCapacity
                .slice(0, 3)
                .map(t => `${t.name} (${t.used}/${t.limit})`)
                .join(', ')}
              {ins.overCapacity.length > 3 ? ` +${ins.overCapacity.length - 3} more` : ''}
            </div>
          )}
          {ins.nearCapacity.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[10.5px] uppercase tracking-[0.04em] text-[#6E6E73] font-medium">
                Tables near capacity
              </div>
              {ins.nearCapacity.slice(0, 5).map(t => (
                <div
                  key={t.name}
                  className="flex items-center justify-between text-[13px] bg-[#FBF8F2] border border-[#ECE5D8] rounded-lg px-3 py-2"
                >
                  <span className="text-[#1D1D1F] truncate pr-2">{t.name}</span>
                  <span className="text-[#6E6E73] text-[12px] tabular-nums shrink-0">
                    {t.used}/{t.limit}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </IntelligenceSection>
  );
};

export default SeatingIntelligenceSection;
