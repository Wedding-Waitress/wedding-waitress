import { useMemo } from 'react';
import { ChefHat } from 'lucide-react';
import IntelligenceSection from '../IntelligenceSection';
import InsightCard from '../InsightCard';
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
      <div className="grid grid-cols-2 gap-2 mb-3">
        <InsightCard label="With Requirements" value={ins.totalWithDietary} tone={ins.totalWithDietary ? 'info' : 'neutral'} />
        <InsightCard label="% of Attending" value={`${Math.round(ins.pctOfAttending * 100)}%`} />
      </div>
      {ins.breakdown.length > 0 ? (
        <div className="space-y-1.5">
          <div className="text-[11px] uppercase tracking-wide text-[#6E6E73]">Breakdown</div>
          {ins.breakdown.map(b => (
            <div key={b.tag} className="flex items-center justify-between text-sm bg-[#FBF7F2] rounded-lg px-3 py-2">
              <span className="text-[#1D1D1F]">{b.tag}</span>
              <span className="text-[#6E6E73] text-xs">{b.count}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-xs text-[#6E6E73]">No dietary requirements recorded.</div>
      )}
    </IntelligenceSection>
  );
};

export default DietaryIntelligenceSection;
