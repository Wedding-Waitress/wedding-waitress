import { useMemo } from 'react';
import { ChefHat } from 'lucide-react';
import IntelligenceSection from '../IntelligenceSection';
import InsightCard from '../InsightCard';
import EmptyHint from '../EmptyHint';
import { computeDietaryInsights } from '../lib/computeGuestInsights';
import type { Guest } from '@/hooks/useGuests';

export const DietaryIntelligenceSection = ({ guests }: { guests: Guest[] }) => {
  const ins = useMemo(() => computeDietaryInsights(guests), [guests]);
  return (
    <IntelligenceSection
      value="dietary"
      title="Dietary Intelligence"
      description="Requirements across attending guests"
      icon={<ChefHat className="w-4 h-4" />}
      badge={ins.totalWithDietary || ''}
    >
      {ins.totalWithDietary === 0 ? (
        <EmptyHint>No dietary requirements recorded for any guests.</EmptyHint>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2.5 mb-3">
            <InsightCard
              label="With Requirements"
              value={ins.totalWithDietary}
              tone="info"
            />
            <InsightCard
              label="% of Attending"
              value={`${Math.round(ins.pctOfAttending * 100)}%`}
            />
          </div>
          <div className="space-y-1.5">
            <div className="text-[10.5px] uppercase tracking-[0.04em] text-[#6E6E73] font-medium">
              Breakdown
            </div>
            {ins.breakdown.map(b => (
              <div
                key={b.tag}
                className="flex items-center justify-between text-[13px] bg-[#FBF8F2] border border-[#ECE5D8] rounded-lg px-3 py-2"
              >
                <span className="text-[#1D1D1F] truncate pr-2">{b.tag}</span>
                <span className="text-[#6E6E73] text-[12px] tabular-nums shrink-0">{b.count}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </IntelligenceSection>
  );
};

export default DietaryIntelligenceSection;
