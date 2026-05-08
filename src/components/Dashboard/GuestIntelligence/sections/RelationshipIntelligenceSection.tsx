import { useMemo } from 'react';
import { Users } from 'lucide-react';
import IntelligenceSection from '../IntelligenceSection';
import InsightCard from '../InsightCard';
import EmptyHint from '../EmptyHint';
import { computeRelationshipInsights } from '../lib/computeGuestInsights';
import type { Guest } from '@/hooks/useGuests';

export const RelationshipIntelligenceSection = ({ guests }: { guests: Guest[] }) => {
  const ins = useMemo(() => computeRelationshipInsights(guests), [guests]);
  const hasData = ins.partnerOne + ins.partnerTwo + ins.unspecified > 0;

  return (
    <IntelligenceSection
      value="relationship"
      title="Relationship Intelligence"
      description="Side balance and top relation roles"
      icon={<Users className="w-4 h-4" />}
      badge={ins.imbalance ? 'Imbalanced' : ''}
      badgeTone="warning"
    >
      {!hasData ? (
        <EmptyHint>No relationship data yet — assign sides and roles on your guests.</EmptyHint>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2.5 mb-3">
            <InsightCard label="Partner 1" value={ins.partnerOne} />
            <InsightCard label="Partner 2" value={ins.partnerTwo} />
            <InsightCard label="Unspecified" value={ins.unspecified} />
          </div>
          {ins.imbalance && (
            <div className="rounded-xl bg-[#FBF4E8] border border-[#EDDDC0] px-3 py-2.5 text-[12px] text-[#8A5A14] mb-3 leading-snug">
              One side accounts for over 70% of guests. Consider revisiting balance.
            </div>
          )}
          {ins.topRoles.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[10.5px] uppercase tracking-[0.04em] text-[#6E6E73] font-medium">
                Top roles
              </div>
              {ins.topRoles.map(r => (
                <div
                  key={r.role}
                  className="flex items-center justify-between text-[13px] bg-[#FBF8F2] border border-[#ECE5D8] rounded-lg px-3 py-2"
                >
                  <span className="text-[#1D1D1F] capitalize truncate pr-2">
                    {r.role.replace(/_/g, ' ')}
                  </span>
                  <span className="text-[#6E6E73] text-[12px] tabular-nums shrink-0">{r.count}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </IntelligenceSection>
  );
};

export default RelationshipIntelligenceSection;
