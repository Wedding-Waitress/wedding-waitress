import { useMemo } from 'react';
import { MapPin, AlertTriangle, Users, Home } from 'lucide-react';
import IntelligenceSection from '../IntelligenceSection';
import EmptyHint from '../EmptyHint';
import { computeSeatingInsights, type TableLite } from '../lib/computeGuestInsights';
import type { Guest } from '@/hooks/useGuests';

const Stat = ({
  label, value, tone = 'neutral', hint,
}: { label: string; value: React.ReactNode; tone?: 'neutral' | 'positive' | 'warning' | 'info'; hint?: string }) => {
  const valueColor =
    tone === 'warning' ? 'text-[#8A5A14]' : tone === 'positive' ? 'text-[#2F6B2F]' : 'text-[#1D1D1F]';
  return (
    <div className="rounded-lg bg-white border border-[#ECE5D8] px-2.5 py-2 text-center">
      <div className="text-[10px] uppercase tracking-[0.04em] text-[#6E6E73] font-medium">{label}</div>
      <div className={`text-[14px] font-semibold mt-0.5 tabular-nums ${valueColor}`}>{value}</div>
      {hint && <div className="text-[10px] text-[#6E6E73] mt-0.5">{hint}</div>}
    </div>
  );
};

const TableRow = ({
  name, right, tone = 'neutral',
}: { name: string; right: React.ReactNode; tone?: 'neutral' | 'warning' | 'danger' }) => {
  const rightColor =
    tone === 'danger' ? 'text-[#8A1414]' : tone === 'warning' ? 'text-[#8A5A14]' : 'text-[#6E6E73]';
  return (
    <div className="flex items-center justify-between text-[13px] bg-[#FBF8F2] border border-[#ECE5D8] rounded-lg px-3 py-2">
      <span className="text-[#1D1D1F] truncate pr-2">{name}</span>
      <span className={`text-[12px] tabular-nums shrink-0 ${rightColor}`}>{right}</span>
    </div>
  );
};

export const SeatingIntelligenceSection = ({
  guests,
  tables,
}: {
  guests: Guest[];
  tables: TableLite[];
}) => {
  const ins = useMemo(() => computeSeatingInsights(guests, tables), [guests, tables]);
  const noTables = tables.length === 0;
  const completionPctRound = Math.round(ins.completionPct * 100);

  // Logic-based gating
  const showCouplesInsight = ins.couplesPairsConsidered > 0;
  const showFamilyInsight = ins.familySplits.length > 0;

  const badgeText =
    ins.overCapacity.length > 0
      ? `${ins.overCapacity.length} over capacity`
      : ins.unassigned > 0
        ? `${ins.unassigned} unseated`
        : '';
  const badgeTone: 'warning' | 'neutral' = ins.overCapacity.length > 0 || ins.unassigned > 0 ? 'warning' : 'neutral';

  return (
    <IntelligenceSection
      value="seating"
      title="Seating Intelligence"
      description="Assignments, capacity and table balance"
      icon={<MapPin className="w-4 h-4" />}
      badge={badgeText}
      badgeTone={badgeTone}
    >
      {noTables ? (
        <EmptyHint>Create tables to unlock seating insights.</EmptyHint>
      ) : ins.attendingTotal === 0 ? (
        <EmptyHint>No attending guests yet — seating insights will appear after RSVPs come in.</EmptyHint>
      ) : (
        <div className="space-y-4">
          {/* Top stats */}
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Unseated" value={ins.unassigned} tone={ins.unassigned > 0 ? 'warning' : 'positive'} />
            <Stat label="Empty Seats" value={ins.emptySeats} hint={ins.totalCapacity ? `of ${ins.totalCapacity}` : undefined} />
            <Stat label="Empty Tables" value={ins.emptyTables} />
          </div>

          {/* Completion progress */}
          <div>
            <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.04em] text-[#6E6E73] font-medium mb-1.5">
              <span>Seating completion</span>
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
            <div className="text-[11.5px] text-[#6E6E73] mt-1.5">
              {ins.assigned} of {ins.attendingTotal} attending guest{ins.attendingTotal === 1 ? '' : 's'} seated
            </div>
          </div>

          {/* Balance summary chips */}
          {(ins.underFilledTables.length > 0 || ins.nearCapacity.length > 0 || ins.atCapacityTables.length > 0) && (
            <div className="grid grid-cols-3 gap-2">
              <Stat label="Under-filled" value={ins.underFilledTables.length} hint="≤ 50%" />
              <Stat label="Near full" value={ins.nearCapacity.length} hint="≥ 90%" tone="info" />
              <Stat label="At capacity" value={ins.atCapacityTables.length} tone={ins.atCapacityTables.length > 0 ? 'positive' : 'neutral'} />
            </div>
          )}

          {/* Over capacity warning */}
          {ins.overCapacity.length > 0 && (
            <div className="rounded-xl bg-[#FBECEC] border border-[#EBC9C9] px-3 py-2.5">
              <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.04em] text-[#8A1414] font-semibold mb-2">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Over capacity</span>
              </div>
              <div className="space-y-1">
                {ins.overCapacity.slice(0, 4).map(t => (
                  <div key={t.name} className="flex items-center justify-between text-[12.5px] text-[#5C1414]">
                    <span className="truncate pr-2">{t.name}</span>
                    <span className="tabular-nums font-medium shrink-0">{t.used}/{t.limit}</span>
                  </div>
                ))}
                {ins.overCapacity.length > 4 && (
                  <div className="text-[11.5px] text-[#8A1414] mt-1">+{ins.overCapacity.length - 4} more</div>
                )}
              </div>
            </div>
          )}

          {/* Near capacity */}
          {ins.nearCapacity.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[10.5px] uppercase tracking-[0.04em] text-[#6E6E73] font-medium">
                Tables near capacity
              </div>
              {ins.nearCapacity.slice(0, 5).map(t => (
                <TableRow key={t.name} name={t.name} right={`${t.used}/${t.limit}`} tone="warning" />
              ))}
            </div>
          )}

          {/* Largest tables */}
          {ins.largestTables.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[10.5px] uppercase tracking-[0.04em] text-[#6E6E73] font-medium">
                Largest tables
              </div>
              {ins.largestTables.map(t => (
                <TableRow
                  key={t.name}
                  name={t.name}
                  right={t.limit ? `${t.used}/${t.limit}` : `${t.used} guest${t.used === 1 ? '' : 's'}`}
                />
              ))}
            </div>
          )}

          {/* Couples seated separately (only when data exists) */}
          {showCouplesInsight && (
            <div
              className={`rounded-xl px-3 py-2.5 flex items-center gap-2 text-[12.5px] leading-snug ${
                ins.couplesSeparated > 0
                  ? 'bg-[#FBF4E8] border border-[#EDDDC0] text-[#8A5A14]'
                  : 'bg-[#FBF8F2] border border-[#ECE5D8] text-[#1D1D1F]'
              }`}
            >
              <Users className={`w-3.5 h-3.5 shrink-0 ${ins.couplesSeparated > 0 ? 'text-[#8A5A14]' : 'text-[#967A59]'}`} />
              <span>
                {ins.couplesSeparated > 0 ? (
                  <>
                    <span className="font-semibold">{ins.couplesSeparated}</span> couple{ins.couplesSeparated === 1 ? '' : 's'} seated at different tables
                    <span className="text-[#6E6E73] font-normal"> · of {ins.couplesPairsConsidered} paired</span>
                  </>
                ) : (
                  <>All {ins.couplesPairsConsidered} seated couple{ins.couplesPairsConsidered === 1 ? '' : 's'} are seated together</>
                )}
              </span>
            </div>
          )}

          {/* Family group splits (only when data exists) */}
          {showFamilyInsight && (
            <div className="space-y-1.5">
              <div className="text-[10.5px] uppercase tracking-[0.04em] text-[#6E6E73] font-medium">
                Family groups split across tables
              </div>
              {ins.familySplits.map(f => (
                <div
                  key={f.name}
                  className="flex items-center justify-between text-[13px] bg-[#FBF4E8] border border-[#EDDDC0] rounded-lg px-3 py-2"
                >
                  <span className="flex items-center gap-2 text-[#5C4626] truncate pr-2">
                    <Home className="w-3.5 h-3.5 text-[#967A59] shrink-0" />
                    <span className="truncate">{f.name}</span>
                  </span>
                  <span className="text-[#8A5A14] text-[12px] tabular-nums shrink-0">
                    {f.total} across {f.tableCount} tables
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </IntelligenceSection>
  );
};

export default SeatingIntelligenceSection;
