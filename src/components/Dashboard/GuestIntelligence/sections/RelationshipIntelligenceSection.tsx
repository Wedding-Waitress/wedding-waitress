import { useMemo } from 'react';
import { Users, Heart, Home, Star, UserPlus } from 'lucide-react';
import IntelligenceSection from '../IntelligenceSection';
import InsightCard from '../InsightCard';
import EmptyHint from '../EmptyHint';
import { computeRelationshipInsights } from '../lib/computeGuestInsights';
import type { Guest } from '@/hooks/useGuests';

interface Props {
  guests: Guest[];
  partner1Name?: string | null;
  partner2Name?: string | null;
}

const SignalRow = ({
  icon, label, value, tone = 'neutral',
}: { icon?: React.ReactNode; label: string; value: React.ReactNode; tone?: 'neutral' | 'warning' | 'positive' }) => {
  const valueColor =
    tone === 'warning' ? 'text-[#8A5A14]' : tone === 'positive' ? 'text-[#2F6B2F]' : 'text-[#1D1D1F]';
  return (
    <div className="flex items-center justify-between text-[13px] bg-[#FBF8F2] border border-[#ECE5D8] rounded-lg px-3 py-2">
      <span className="flex items-center gap-2 text-[#1D1D1F] truncate pr-2">
        {icon ? <span className="text-[#967A59] shrink-0">{icon}</span> : null}
        <span className="truncate">{label}</span>
      </span>
      <span className={`text-[12.5px] font-medium tabular-nums shrink-0 ${valueColor}`}>{value}</span>
    </div>
  );
};

export const RelationshipIntelligenceSection = ({ guests, partner1Name, partner2Name }: Props) => {
  const ins = useMemo(() => computeRelationshipInsights(guests), [guests]);
  const total = guests.length;
  const hasAnyRelationData =
    total > 0 &&
    (ins.partnerOne + ins.partnerTwo > 0 ||
      ins.familyGroupsCount > 0 ||
      ins.plusOnesAdded > 0 ||
      ins.categorized > 0);

  const sideTotal = ins.partnerOne + ins.partnerTwo;
  const p1Pct = sideTotal ? Math.round((ins.partnerOne / sideTotal) * 100) : 0;
  const p2Pct = sideTotal ? 100 - p1Pct : 0;
  const p1Label = (partner1Name?.trim() || 'Partner 1') + ' side';
  const p2Label = (partner2Name?.trim() || 'Partner 2') + ' side';
  const coveragePctRound = Math.round(ins.coveragePct * 100);

  return (
    <IntelligenceSection
      value="relationship"
      title="Relationship Intelligence"
      description="Sides, families, plus-ones and coverage"
      icon={<Users className="w-4 h-4" />}
      badge={ins.imbalance ? 'Imbalanced' : ins.uncategorized > 0 && total > 0 ? `${ins.uncategorized} uncategorized` : ''}
      badgeTone={ins.imbalance ? 'warning' : 'neutral'}
    >
      {!hasAnyRelationData ? (
        <EmptyHint>No relationship data yet — assign sides, families and roles on your guests.</EmptyHint>
      ) : (
        <div className="space-y-4">
          {/* Side comparison */}
          {sideTotal > 0 && (
            <div>
              <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.04em] text-[#6E6E73] font-medium mb-1.5">
                <span>Side balance</span>
                <span className="tabular-nums normal-case tracking-normal text-[#1D1D1F]">
                  {ins.partnerOne} · {ins.partnerTwo}
                </span>
              </div>
              <div className="flex h-2 w-full overflow-hidden rounded-full bg-[#ECE5D8]">
                <div
                  className="bg-[#967A59] transition-all"
                  style={{ width: `${p1Pct}%` }}
                  aria-label={`${p1Label} ${p1Pct}%`}
                />
                <div
                  className="bg-[#C9B89A] transition-all"
                  style={{ width: `${p2Pct}%` }}
                  aria-label={`${p2Label} ${p2Pct}%`}
                />
              </div>
              <div className="flex items-center justify-between text-[11.5px] text-[#6E6E73] mt-1.5">
                <span className="truncate pr-2"><span className="inline-block w-2 h-2 rounded-full bg-[#967A59] mr-1.5 align-middle" />{p1Label} · {p1Pct}%</span>
                <span className="truncate pl-2 text-right"><span className="inline-block w-2 h-2 rounded-full bg-[#C9B89A] mr-1.5 align-middle" />{p2Label} · {p2Pct}%</span>
              </div>
              {ins.unspecified > 0 && (
                <div className="text-[11.5px] text-[#8A5A14] mt-1.5">
                  {ins.unspecified} guest{ins.unspecified === 1 ? '' : 's'} without a side assigned
                </div>
              )}
            </div>
          )}

          {/* Composition */}
          <div className="grid grid-cols-3 gap-2.5">
            <InsightCard label="Couples" value={ins.coupleUnits} />
            <InsightCard label="Individuals" value={ins.individuals} />
            <InsightCard label="Families" value={ins.familyGroupsCount} />
          </div>

          {/* Largest family groups */}
          {ins.topFamilies.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[10.5px] uppercase tracking-[0.04em] text-[#6E6E73] font-medium">
                Largest family groups
              </div>
              {ins.topFamilies.map(f => (
                <SignalRow
                  key={f.name}
                  icon={<Home className="w-3.5 h-3.5" />}
                  label={f.name}
                  value={`${f.count} guest${f.count === 1 ? '' : 's'}`}
                />
              ))}
            </div>
          )}

          {/* Plus-one insights */}
          {(ins.plusOnesAdded > 0 || ins.plusOneSlotsOpen > 0) && (
            <div className="space-y-1.5">
              <div className="text-[10.5px] uppercase tracking-[0.04em] text-[#6E6E73] font-medium">
                Plus-ones
              </div>
              <SignalRow
                icon={<Heart className="w-3.5 h-3.5" />}
                label="Confirmed plus-ones"
                value={ins.plusOnesAttending}
                tone={ins.plusOnesAttending > 0 ? 'positive' : 'neutral'}
              />
              {ins.plusOnesPending > 0 && (
                <SignalRow
                  icon={<Heart className="w-3.5 h-3.5" />}
                  label="Pending plus-ones"
                  value={ins.plusOnesPending}
                  tone="warning"
                />
              )}
              {ins.plusOneSlotsOpen > 0 && (
                <SignalRow
                  icon={<UserPlus className="w-3.5 h-3.5" />}
                  label="Plus-one slots not yet filled"
                  value={ins.plusOneSlotsOpen}
                  tone="warning"
                />
              )}
            </div>
          )}

          {/* Coverage */}
          {total > 0 && (
            <div>
              <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.04em] text-[#6E6E73] font-medium mb-1.5">
                <span>Relationship coverage</span>
                <span className="tabular-nums normal-case tracking-normal text-[#1D1D1F]">
                  {coveragePctRound}%
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-[#ECE5D8]">
                <div
                  className="h-full bg-[#967A59] transition-all"
                  style={{ width: `${coveragePctRound}%` }}
                />
              </div>
              <div className="text-[11.5px] text-[#6E6E73] mt-1.5">
                {ins.categorized} of {total} guest{total === 1 ? '' : 's'} have a side or role
                {ins.uncategorized > 0 ? ` · ${ins.uncategorized} uncategorized` : ''}
              </div>
            </div>
          )}

          {/* Top roles */}
          {ins.topRoles.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[10.5px] uppercase tracking-[0.04em] text-[#6E6E73] font-medium">
                Top roles
              </div>
              {ins.topRoles.map(r => (
                <SignalRow
                  key={r.role}
                  icon={<Star className="w-3.5 h-3.5" />}
                  label={r.role.replace(/_/g, ' ')}
                  value={r.count}
                />
              ))}
            </div>
          )}

          {/* VIP / key family highlight */}
          {ins.vipCount > 0 && (
            <div className="rounded-xl bg-[#F4EDE0] border border-[#E1D2B4] px-3 py-2.5 text-[12.5px] text-[#5C4626] leading-snug flex items-center gap-2">
              <Star className="w-3.5 h-3.5 text-[#967A59] shrink-0" />
              <span>
                <span className="font-semibold">{ins.vipCount}</span> guest{ins.vipCount === 1 ? '' : 's'} flagged as immediate family or wedding party
              </span>
            </div>
          )}
        </div>
      )}
    </IntelligenceSection>
  );
};

export default RelationshipIntelligenceSection;
