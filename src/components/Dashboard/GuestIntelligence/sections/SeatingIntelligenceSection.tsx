import { useMemo } from 'react';
import { MapPin } from 'lucide-react';
import IntelligenceSection from '../IntelligenceSection';
import InsightCard from '../InsightCard';
import { computeSeatingInsights, type TableLite } from '../lib/computeGuestInsights';
import type { Guest } from '@/hooks/useGuests';

export const SeatingIntelligenceSection = ({ guests, tables }: { guests: Guest[]; tables: TableLite[] }) => {
  const ins = useMemo(() => computeSeatingInsights(guests, tables), [guests, tables]);
  return (
    <IntelligenceSection
      value="seating"
      title="Seating Intelligence"
      description="Assignments and table capacity signals"
      icon={<MapPin className="w-4 h-4" />}
      badge={ins.unassigned > 0 ? `${ins.unassigned} unseated` : ''}
    >
      <div className="grid grid-cols-2 gap-2 mb-3">
        <InsightCard label="Assigned" value={ins.assigned} tone="positive" />
        <InsightCard label="Unassigned" value={ins.unassigned} tone={ins.unassigned > 0 ? 'warning' : 'neutral'} />
        <InsightCard label="Empty Tables" value={ins.emptyTables} />
        <InsightCard label="Near Capacity" value={ins.nearCapacity.length} hint="≥90% seated" tone="info" />
      </div>
      {ins.overCapacity.length > 0 && (
        <div className="rounded-xl bg-[#FBE8E8] border border-[#EBBDBD] p-3 text-xs text-[#8A1414] mb-2">
          Over-capacity tables: {ins.overCapacity.map(t => `${t.name} (${t.used}/${t.limit})`).join(', ')}
        </div>
      )}
      {ins.nearCapacity.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[11px] uppercase tracking-wide text-[#6E6E73]">Tables near capacity</div>
          {ins.nearCapacity.slice(0, 5).map(t => (
            <div key={t.name} className="flex items-center justify-between text-sm bg-[#FBF7F2] rounded-lg px-3 py-2">
              <span className="text-[#1D1D1F]">{t.name}</span>
              <span className="text-[#6E6E73] text-xs">{t.used}/{t.limit}</span>
            </div>
          ))}
        </div>
      )}
    </IntelligenceSection>
  );
};

export default SeatingIntelligenceSection;
