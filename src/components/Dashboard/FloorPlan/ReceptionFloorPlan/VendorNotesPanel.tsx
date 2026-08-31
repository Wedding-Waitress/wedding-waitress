/**
 * Vendor Setup Notes panel — single rich textarea for setup notes (DJ, bar,
 * cake table, power, fire exits, coordinator notes, etc.). Saves to the
 * reception_floor_plans row via the existing debounced update().
 */
import { ClipboardList } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import type { ReceptionFloorPlan } from '@/hooks/useReceptionFloorPlan';

interface Props {
  plan: ReceptionFloorPlan;
  onChange: (mutator: (p: ReceptionFloorPlan) => ReceptionFloorPlan) => void;
}

const PLACEHOLDER = `Add setup notes for the venue & vendors. Examples:
• DJ / Band setup, power requirements
• Cake table, photo booth, bar location
• Kitchen access, bump-in time, fire exits
• Anything the coordinator should know`;

const MAX_LEN = 4000;

export const VendorNotesPanel = ({ plan, onChange }: Props) => {
  const value = plan.vendor_notes ?? '';
  return (
    <div data-reception-panel="true" className="rounded-lg border border-border bg-card p-3 max-lg:p-4 space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div data-floor-plan-feature-heading="true" className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <ClipboardList className="w-4 h-4 text-[#967A59]" />
          Vendor setup notes
        </div>
        <span className="text-[11px] text-muted-foreground">
          {value.length}/{MAX_LEN}
        </span>
      </div>
      <Textarea
        value={value}
        onChange={(e) => {
          const next = e.target.value.slice(0, MAX_LEN);
          onChange((p) => ({ ...p, vendor_notes: next }));
        }}
        placeholder={PLACEHOLDER}
        rows={5}
        className="min-h-[120px] text-sm leading-relaxed max-lg:text-base"
      />
      <p className="text-[11px] text-muted-foreground">
        Notes appear on the PDF export and the read-only share view.
      </p>
    </div>
  );
};
