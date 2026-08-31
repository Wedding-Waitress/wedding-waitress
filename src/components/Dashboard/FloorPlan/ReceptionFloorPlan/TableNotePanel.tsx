/**
 * Table Note panel — shown when a placed table is selected on the canvas.
 * Lets the user attach a short note (e.g. "Elderly guests", "Wheelchair access").
 * Stored inline on the matching `table_positions[].note`. Does not touch the
 * Guest List or Tables page data.
 */
import { StickyNote, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { ReceptionFloorPlan } from '@/hooks/useReceptionFloorPlan';
import type { ReceptionTable } from '@/hooks/useReceptionTables';

const SUGGESTIONS = [
  'Elderly guests',
  'Kids table',
  'Wheelchair access',
  'Close to bridal table',
  'VIP family',
  'Keep near entrance',
];

const MAX_LEN = 80;

interface Props {
  plan: ReceptionFloorPlan;
  tables: ReceptionTable[];
  selectedTableId: string | null;
  onClose: () => void;
  onChange: (mutator: (p: ReceptionFloorPlan) => ReceptionFloorPlan) => void;
}

export const TableNotePanel = ({
  plan,
  tables,
  selectedTableId,
  onClose,
  onChange,
}: Props) => {
  if (!selectedTableId) return null;
  const pos = plan.table_positions.find((p) => p.table_id === selectedTableId);
  if (!pos) return null;
  const table = tables.find((t) => t.id === selectedTableId);
  const label = table?.name || (table ? `Table ${table.table_no}` : 'Selected table');
  const note = pos.note ?? '';

  const setNote = (next: string) => {
    const v = next.slice(0, MAX_LEN);
    onChange((p) => ({
      ...p,
      table_positions: p.table_positions.map((tp) =>
        tp.table_id === selectedTableId ? { ...tp, note: v } : tp
      ),
    }));
  };

  return (
    <div data-reception-panel="true" className="rounded-lg border border-[#967A59]/40 bg-[#967A59]/5 p-3 max-lg:p-4 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div data-floor-plan-feature-heading="true" className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <StickyNote className="w-4 h-4 text-[#967A59]" />
          Table note · <span className="text-[#7a6347]">{label}</span>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={onClose}
          className="h-7 px-2 text-muted-foreground hover:text-foreground"
          title="Close"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
      <Input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="e.g. Elderly guests, near entrance"
        maxLength={MAX_LEN}
        className="h-9 max-lg:h-11 max-lg:text-base bg-background"
      />
      <div className="flex flex-wrap gap-1.5">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setNote(s)}
            className="lv-premium-shade rounded-full border border-border bg-background px-2.5 py-1 text-[11px] text-foreground hover:border-[#967A59]/60"
          >
            {s}
          </button>
        ))}
        {note && (
          <button
            type="button"
            onClick={() => setNote('')}
            className="lv-premium-shade rounded-full border border-destructive/30 bg-background px-2.5 py-1 text-[11px] text-destructive hover:bg-destructive/5"
          >
            Clear note
          </button>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground">
        Notes show as a small indicator on the table and are included in the
        PDF legend and share view.
      </p>
    </div>
  );
};
