import { useMemo } from 'react';
import { ChefHat, AlertTriangle, Sparkles } from 'lucide-react';
import IntelligenceSection from '../IntelligenceSection';
import EmptyHint from '../EmptyHint';
import { computeDietaryInsights } from '../lib/computeGuestInsights';
import type { Guest } from '@/hooks/useGuests';

const CATEGORY_PALETTE: Record<string, string> = {
  vegetarian: '#7BA86B',
  vegan: '#5C8F4C',
  halal: '#967A59',
  kosher: '#A98A66',
  gluten_free: '#C9A86A',
  dairy_free: '#D4B98A',
  nut_allergy: '#C97A6A',
  shellfish: '#B5604F',
  egg: '#D8A86A',
  soy: '#B59E78',
  pescatarian: '#6A95A8',
  kids_meal: '#8A8FBA',
  other: '#B5AC9A',
};

const colorFor = (key: string) => CATEGORY_PALETTE[key] ?? '#967A59';

export const DietaryIntelligenceSection = ({ guests }: { guests: Guest[] }) => {
  const ins = useMemo(() => computeDietaryInsights(guests), [guests]);
  const completionPctRound = Math.round(ins.completionPct * 100);

  const hasData = ins.attendingTotal > 0 && (ins.totalWithDietary > 0 || ins.missing > 0);

  return (
    <IntelligenceSection
      value="dietary"
      title="Dietary Intelligence"
      description="Meal requirements across attending guests"
      icon={<ChefHat className="w-4 h-4" />}
      badge={ins.alerts.length > 0 ? `${ins.alerts.reduce((s, a) => s + a.count, 0)} allergy alert${ins.alerts.length === 1 ? '' : 's'}` : ins.totalWithDietary || ''}
      badgeTone={ins.alerts.length > 0 ? 'warning' : 'neutral'}
    >
      {!hasData ? (
        <EmptyHint>No dietary requirements recorded yet — guests will appear once they RSVP and add details.</EmptyHint>
      ) : (
        <div className="space-y-4">
          {/* Top stats */}
          <div className="grid grid-cols-3 gap-2">
            <Stat label="With Reqs" value={ins.totalWithDietary} tone="info" />
            <Stat label="Missing" value={ins.missing} tone={ins.missing > 0 ? 'warning' : 'neutral'} />
            <Stat label="Attending" value={ins.attendingTotal} />
          </div>

          {/* Completion progress */}
          <div>
            <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.04em] text-[#6E6E73] font-medium mb-1.5">
              <span>Meal info completion</span>
              <span className="tabular-nums normal-case tracking-normal text-[#1D1D1F]">
                {completionPctRound}%
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-[#ECE5D8]">
              <div
                className="h-full bg-[#967A59] transition-all"
                style={{ width: `${completionPctRound}%` }}
              />
            </div>
            {ins.missing > 0 && (
              <div className="text-[11.5px] text-[#8A5A14] mt-1.5">
                {ins.missing} attending guest{ins.missing === 1 ? '' : 's'} missing dietary info
              </div>
            )}
          </div>

          {/* Most common */}
          {ins.topCategory && (
            <div className="rounded-xl bg-[#FBF8F2] border border-[#ECE5D8] px-3 py-2.5 flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-full bg-[#F4EDE0] flex items-center justify-center text-[#967A59] shrink-0">
                <Sparkles className="w-3.5 h-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[10.5px] uppercase tracking-[0.04em] text-[#6E6E73] font-medium">
                  Most common requirement
                </div>
                <div className="text-[13px] text-[#1D1D1F] font-medium truncate">
                  {ins.topCategory.label}{' '}
                  <span className="text-[#6E6E73] font-normal">· {ins.topCategory.count} guest{ins.topCategory.count === 1 ? '' : 's'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Allergy alerts */}
          {ins.alerts.length > 0 && (
            <div className="rounded-xl bg-[#FBF1EE] border border-[#EFD4CC] px-3 py-2.5">
              <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.04em] text-[#9A4A36] font-semibold mb-2">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Allergy alerts</span>
              </div>
              <div className="space-y-1">
                {ins.alerts.map(a => (
                  <div key={a.key} className="flex items-center justify-between text-[12.5px] text-[#5C2E22]">
                    <span className="truncate pr-2">{a.label}</span>
                    <span className="tabular-nums font-medium shrink-0">
                      {a.count} guest{a.count === 1 ? '' : 's'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Distribution bar */}
          {ins.categories.length > 0 && (
            <div>
              <div className="text-[10.5px] uppercase tracking-[0.04em] text-[#6E6E73] font-medium mb-1.5">
                Dietary distribution
              </div>
              <div className="flex h-2 w-full overflow-hidden rounded-full bg-[#ECE5D8]">
                {ins.categories.map(c => {
                  const pct = ins.totalWithDietary ? (c.count / ins.totalWithDietary) * 100 : 0;
                  if (pct <= 0) return null;
                  return (
                    <div
                      key={c.key}
                      className="h-full"
                      style={{ width: `${pct}%`, backgroundColor: colorFor(c.key) }}
                      title={`${c.label} · ${c.count}`}
                    />
                  );
                })}
              </div>

              {/* Category chips */}
              <div className="grid grid-cols-2 gap-1.5 mt-2.5">
                {ins.categories.map(c => (
                  <div
                    key={c.key}
                    className="flex items-center justify-between text-[12.5px] bg-[#FBF8F2] border border-[#ECE5D8] rounded-lg px-2.5 py-1.5"
                  >
                    <span className="flex items-center gap-1.5 truncate pr-1.5">
                      <span
                        className="inline-block w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: colorFor(c.key) }}
                      />
                      <span className="truncate text-[#1D1D1F]">{c.label}</span>
                    </span>
                    <span className="tabular-nums text-[#6E6E73] shrink-0">{c.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Attention notes */}
          {ins.attentionNotes.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[10.5px] uppercase tracking-[0.04em] text-[#6E6E73] font-medium">
                Catering attention
              </div>
              {ins.attentionNotes.map(n => (
                <div
                  key={n.id}
                  className="rounded-lg bg-[#FBF4E8] border border-[#EDDDC0] px-3 py-2 text-[12.5px] text-[#8A5A14] leading-snug"
                >
                  {n.text}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </IntelligenceSection>
  );
};

const Stat = ({
  label, value, tone = 'neutral',
}: { label: string; value: React.ReactNode; tone?: 'neutral' | 'info' | 'warning' }) => {
  const valueColor =
    tone === 'warning' ? 'text-[#8A5A14]' : tone === 'info' ? 'text-[#1D1D1F]' : 'text-[#1D1D1F]';
  return (
    <div className="rounded-lg bg-white border border-[#ECE5D8] px-2.5 py-2 text-center">
      <div className="text-[10px] uppercase tracking-[0.04em] text-[#6E6E73] font-medium">{label}</div>
      <div className={`text-[14px] font-semibold mt-0.5 tabular-nums ${valueColor}`}>{value}</div>
    </div>
  );
};

export default DietaryIntelligenceSection;
