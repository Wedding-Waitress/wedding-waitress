import { useMemo } from 'react';
import { Users } from 'lucide-react';
import IntelligenceSection from '../IntelligenceSection';
import InsightCard from '../InsightCard';
import { computeRelationshipInsights } from '../lib/computeGuestInsights';
import type { Guest } from '@/hooks/useGuests';

export const RelationshipIntelligenceSection = ({ guests }: { guests: Guest[] }) => {
  const ins = useMemo(() => computeRelationshipInsights(guests), [guests]);
  return (
    <IntelligenceSection
      value="relationship"
      title="Relationship Intelligence"
      description="Side balance and top relation roles"
      icon={<Users className="w-4 h-4" />}
      badge={ins.imbalance ? 'Imbalanced' : ''}
    >
      <div className="grid grid-cols-3 gap-2 mb-3">
        <InsightCard label="Partner 1" value={ins.partnerOne} />
        <InsightCard label="Partner 2" value={ins.partnerTwo} />
        <InsightCard label="Unspecified" value={ins.unspecified} />
      </div>
      {ins.imbalance && (
        <div className="rounded-xl bg-[#FBF3E8] border border-[#EBD9BD] p-3 text-xs text-[#8A5A14] mb-3">
          One side accounts for over 70% of guests. Consider revisiting balance.
        </div>
      )}
      {ins.topRoles.length > 0 ? (
        <div className="space-y-1.5">
          <div className="text-[11px] uppercase tracking-wide text-[#6E6E73]">Top roles</div>
          {ins.topRoles.map(r => (
            <div key={r.role} className="flex items-center justify-between text-sm bg-[#FBF7F2] rounded-lg px-3 py-2">
              <span className="text-[#1D1D1F] capitalize">{r.role.replace(/_/g, ' ')}</span>
              <span className="text-[#6E6E73] text-xs">{r.count}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-xs text-[#6E6E73]">No roles assigned yet.</div>
      )}
    </IntelligenceSection>
  );
};

export default RelationshipIntelligenceSection;
