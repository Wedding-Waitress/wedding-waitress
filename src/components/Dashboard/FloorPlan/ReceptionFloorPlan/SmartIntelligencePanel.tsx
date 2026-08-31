import { useMemo, useState } from 'react';
import {
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Info,
  ChevronDown,
  ChevronUp,
  Footprints,
  DoorOpen,
  Users,
  Lightbulb,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ReceptionTable } from '@/hooks/useReceptionTables';
import type { ReceptionFloorPlan } from '@/hooks/useReceptionFloorPlan';
import styles from './ReceptionFloorPlanTheme.module.css';

interface Props {
  plan: ReceptionFloorPlan;
  tables: ReceptionTable[];
  attendingCount: number;
  summaryClassName?: string;
  detailsClassName?: string;
}

type Severity = 'good' | 'info' | 'warn' | 'bad';
interface Finding {
  id: string;
  severity: Severity;
  category: 'capacity' | 'walkway' | 'exit' | 'suggestion';
  title: string;
  detail?: string;
}

/** Diameter (m) of a round table given seat count — mirrors canvas sizing. */
const tableDiameterM = (seats: number) =>
  Math.max(1.2, 1.2 + Math.max(0, seats - 6) * 0.12);

/** Footprint radius including chair ring (~50cm clearance). */
const tableFootprintRadiusM = (seats: number) => tableDiameterM(seats) / 2 + 0.5;

const MIN_WALKWAY_M = 0.9; // recommended gap between adjacent table footprints
const MAX_EXIT_DISTANCE_M = 20; // soft cap on furthest table-to-exit distance
const FIXTURE_CLEARANCE_M = 1.0; // recommended buffer around bar/dance floor/stage

/**
 * Phase 4 — Smart intelligence for the Reception Floor Plan.
 * Pure read-only analysis. Never blocks the user; warnings + nudges only.
 */
export const SmartIntelligencePanel = ({
  plan,
  tables,
  attendingCount,
  summaryClassName = '',
  detailsClassName = '',
}: Props) => {
  const [open, setOpen] = useState(true);

  const findings = useMemo<Finding[]>(() => {
    const out: Finding[] = [];

    const placedIds = new Set([
      ...plan.table_positions.map((p) => p.table_id),
      ...plan.fixtures.flatMap((fixture) => fixture.linked_table_id ? [fixture.linked_table_id] : []),
    ]);
    const placed = plan.table_positions
      .map((pos) => {
        const t = tables.find((tt) => tt.id === pos.table_id);
        return t ? { pos, table: t } : null;
      })
      .filter((x): x is { pos: typeof plan.table_positions[number]; table: ReceptionTable } => !!x);

    const placedSeats = tables
      .filter((table) => placedIds.has(table.id))
      .reduce((sum, table) => sum + (table.limit_seats || 0), 0);
    const totalSeats = tables.reduce((s, t) => s + (t.limit_seats || 0), 0);

    // ── Capacity ────────────────────────────────────────────────────────────
    if (attendingCount > 0 && totalSeats > 0) {
      if (attendingCount > totalSeats) {
        const short = attendingCount - totalSeats;
        const avg =
          tables.length > 0
            ? Math.max(2, Math.round(totalSeats / tables.length))
            : 8;
        const extraTables = Math.ceil(short / avg);
        out.push({
          id: 'cap-short',
          severity: 'bad',
          category: 'capacity',
          title: `Short ${short} seat${short === 1 ? '' : 's'} for attending guests.`,
          detail: `Add about ${extraTables} more ${avg}-seater table${extraTables === 1 ? '' : 's'} on the Tables page.`,
        });
      } else if (attendingCount > placedSeats) {
        out.push({
          id: 'cap-place-more',
          severity: 'warn',
          category: 'capacity',
          title: `Place ${attendingCount - placedSeats} more seat${attendingCount - placedSeats === 1 ? '' : 's'} into the room.`,
          detail: 'You have enough tables created — drag the remaining ones from the palette.',
        });
      } else {
        const slack = placedSeats - attendingCount;
        out.push({
          id: 'cap-ok',
          severity: 'good',
          category: 'capacity',
          title: `Capacity looks good (${slack} spare seat${slack === 1 ? '' : 's'}).`,
        });
      }
    }

    // ── Walkway warnings (table-to-table) ───────────────────────────────────
    const tooClose: Array<{ a: string; b: string; gap: number }> = [];
    for (let i = 0; i < placed.length; i++) {
      for (let j = i + 1; j < placed.length; j++) {
        const A = placed[i];
        const B = placed[j];
        const dx = A.pos.x - B.pos.x;
        const dy = A.pos.y - B.pos.y;
        const dist = Math.hypot(dx, dy);
        const gap =
          dist -
          tableFootprintRadiusM(A.table.limit_seats) -
          tableFootprintRadiusM(B.table.limit_seats);
        if (gap < MIN_WALKWAY_M) {
          tooClose.push({ a: A.table.name, b: B.table.name, gap });
        }
      }
    }
    if (tooClose.length > 0) {
      const sample = tooClose.slice(0, 3)
        .map((p) => `${p.a} ↔ ${p.b} (${Math.max(0, p.gap).toFixed(2)}m)`)
        .join(', ');
      out.push({
        id: 'walkway-tables',
        severity: 'warn',
        category: 'walkway',
        title: `${tooClose.length} table pair${tooClose.length === 1 ? '' : 's'} below the ${MIN_WALKWAY_M}m walkway minimum.`,
        detail: `Closest: ${sample}${tooClose.length > 3 ? '…' : ''}. Aim for at least 90cm between chair backs.`,
      });
    }

    // ── Fixture proximity (dance floor / bar / stage) ───────────────────────
    const livelyFixtures = plan.fixtures.filter((f) =>
      ['dance_floor', 'bar', 'stage', 'dj_band'].includes(f.type)
    );
    const fixtureConflicts: string[] = [];
    for (const f of livelyFixtures) {
      const fr = Math.max(f.width_m, f.height_m) / 2;
      for (const { table, pos } of placed) {
        const dx = pos.x - f.x;
        const dy = pos.y - f.y;
        const gap =
          Math.hypot(dx, dy) - fr - tableFootprintRadiusM(table.limit_seats);
        if (gap < FIXTURE_CLEARANCE_M) {
          fixtureConflicts.push(`${table.name} near ${f.label || f.type.replace('_', ' ')}`);
          break;
        }
      }
    }
    if (fixtureConflicts.length > 0) {
      out.push({
        id: 'walkway-fixtures',
        severity: 'warn',
        category: 'walkway',
        title: `${fixtureConflicts.length} table${fixtureConflicts.length === 1 ? '' : 's'} crowd a high-traffic fixture.`,
        detail: `${fixtureConflicts.slice(0, 3).join(', ')}${fixtureConflicts.length > 3 ? '…' : ''}. Keep ~1m clearance from dance floor, bar, stage.`,
      });
    }

    // ── Distance to exit ────────────────────────────────────────────────────
    const doors = plan.fixtures.filter((f) => f.type === 'door');
    if (doors.length === 0 && placed.length > 0) {
      out.push({
        id: 'exit-missing',
        severity: 'info',
        category: 'exit',
        title: 'No door fixture placed yet.',
        detail: 'Add at least one Door from the fixtures palette so guests and staff have a clear exit reference.',
      });
    } else if (doors.length > 0 && placed.length > 0) {
      let worst = 0;
      let worstTable = '';
      for (const { table, pos } of placed) {
        const nearest = Math.min(
          ...doors.map((d) => Math.hypot(pos.x - d.x, pos.y - d.y))
        );
        if (nearest > worst) {
          worst = nearest;
          worstTable = table.name;
        }
      }
      if (worst > MAX_EXIT_DISTANCE_M) {
        out.push({
          id: 'exit-far',
          severity: 'warn',
          category: 'exit',
          title: `Furthest table is ${worst.toFixed(1)}m from the nearest exit.`,
          detail: `${worstTable} sits beyond the ${MAX_EXIT_DISTANCE_M}m soft limit. Consider adding a second door or shifting tables.`,
        });
      } else {
        out.push({
          id: 'exit-ok',
          severity: 'good',
          category: 'exit',
          title: `All placed tables within ${MAX_EXIT_DISTANCE_M}m of an exit.`,
        });
      }
    }

    // ── Smart layout helper suggestions ─────────────────────────────────────
    const types = new Set(plan.fixtures.map((f) => f.type));
    if (attendingCount >= 30 && !types.has('dance_floor')) {
      out.push({
        id: 'sug-dance',
        severity: 'info',
        category: 'suggestion',
        title: 'Add a Dance Floor fixture.',
        detail: 'Most receptions of 30+ guests dedicate a 5×5m dance area near the DJ/band.',
      });
    }
    if (attendingCount >= 40 && !types.has('bar')) {
      out.push({
        id: 'sug-bar',
        severity: 'info',
        category: 'suggestion',
        title: 'Add a Bar fixture.',
        detail: 'Place it along a wall away from the bridal table to keep traffic flowing.',
      });
    }
    if (placed.length > 0 && !tables.some((table) => table.table_purpose === 'head')) {
      out.push({
        id: 'sug-head-table',
        severity: 'info',
        category: 'suggestion',
        title: 'Consider adding a Head Table.',
        detail: 'Create or designate it on the Tables page and it will synchronise here automatically.',
      });
    }
    const unplaced = tables.length - placedIds.size;
    if (unplaced > 0 && attendingCount > 0) {
      out.push({
        id: 'sug-unplaced',
        severity: 'info',
        category: 'suggestion',
        title: `${unplaced} table${unplaced === 1 ? '' : 's'} still in the palette.`,
        detail: 'Drag them into the room to lock the layout in.',
      });
    }

    return out;
  }, [plan, tables, attendingCount]);

  const counts = useMemo(() => {
    return findings.reduce(
      (acc, f) => {
        acc[f.severity] = (acc[f.severity] || 0) + 1;
        return acc;
      },
      { good: 0, info: 0, warn: 0, bad: 0 } as Record<Severity, number>
    );
  }, [findings]);

  const headerTone: Severity =
    counts.bad > 0 ? 'bad' : counts.warn > 0 ? 'warn' : counts.info > 0 ? 'info' : 'good';
  const priorityFinding =
    findings.find((finding) => finding.severity === headerTone) ?? findings[0];

  const toneClasses = (s: Severity) =>
    s === 'bad'
      ? 'border-destructive/40 bg-destructive/5 text-destructive'
      : s === 'warn'
      ? 'border-amber-400/50 bg-amber-50 text-amber-800'
      : s === 'info'
      ? 'border-sky-400/40 bg-sky-50 text-sky-800'
      : 'border-green-500/40 bg-green-50 text-green-800';

  const iconFor = (s: Severity, cat: Finding['category']) => {
    if (cat === 'walkway') return Footprints;
    if (cat === 'exit') return DoorOpen;
    if (cat === 'capacity') return Users;
    if (cat === 'suggestion') return Lightbulb;
    if (s === 'good') return CheckCircle2;
    if (s === 'info') return Info;
    return AlertTriangle;
  };

  return (
    <>
    <section data-reception-setup-card="smart-suggestions" data-reception-smart-panel="true" className={`${summaryClassName} rounded-lg border ${toneClasses(headerTone)}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 p-3 text-left"
        aria-expanded={open}
      >
        <Sparkles className="w-4 h-4 shrink-0" />
        <span data-floor-plan-feature-heading="true" className="text-sm font-semibold">Smart Suggestions</span>
        <span className="ml-1 text-xs opacity-80">
          {counts.bad > 0 && <span className="mr-2">{counts.bad} critical</span>}
          {counts.warn > 0 && <span className="mr-2">{counts.warn} warning{counts.warn === 1 ? '' : 's'}</span>}
          {counts.info > 0 && <span className="mr-2">{counts.info} tip{counts.info === 1 ? '' : 's'}</span>}
          {counts.bad === 0 && counts.warn === 0 && counts.info === 0 && (
            <span>Looking great</span>
          )}
        </span>
        <span className="ml-auto opacity-70">
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
      </button>

      <p className="px-3 pb-3 text-xs text-muted-foreground" data-reception-smart-priority="true">
        {priorityFinding?.title ?? 'Add tables and an attending guest list to see layout guidance.'}
      </p>

    </section>

      {open && (
        <div data-reception-smart-details="true" className={`${detailsClassName} rounded-lg border border-current/10 p-3 bg-background/60 text-foreground`}>
          {findings.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Add some tables and an attending guest list to see smart layout tips here.
            </p>
          ) : (
            <div className={styles.smartSuggestionGrid} data-reception-smart-grid="true">
              {findings.map((f) => {
                const Icon = iconFor(f.severity, f.category);
                return (
                  <div
                    key={f.id}
                    className={`${styles.smartSuggestionCard} rounded-md border p-2.5 flex items-start gap-2 ${toneClasses(f.severity)}`}
                  >
                    <Icon className="w-4 h-4 mt-0.5 shrink-0" />
                    <div className="text-sm flex-1 min-w-0">
                      <div className="font-medium">{f.title}</div>
                      {f.detail && (
                        <div className="text-xs opacity-90 mt-0.5">{f.detail}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div className={styles.smartDetailsFooter}>
          <p className="text-[11px] text-muted-foreground">
            Tips only — nothing here blocks saving, exporting, or sharing your plan.
          </p>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => setOpen(false)}
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}
    </>
  );
};
