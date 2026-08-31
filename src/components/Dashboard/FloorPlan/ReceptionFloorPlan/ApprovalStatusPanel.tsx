/**
 * Approval Status panel — small status selector shown near the top of the
 * Reception Floor Plan page. Lets the user mark the plan as Draft, Sent to
 * Venue, Approved, or Final. Pure UI / nudge; never blocks edits.
 */
import { CheckCircle2, ClipboardCheck, MailCheck, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  ApprovalStatus,
  ReceptionFloorPlan,
} from '@/hooks/useReceptionFloorPlan';

export const APPROVAL_OPTIONS: Array<{
  value: ApprovalStatus;
  label: string;
  Icon: typeof CheckCircle2;
  badgeClass: string;
}> = [
  {
    value: 'draft',
    label: 'Draft',
    Icon: FileText,
    badgeClass: 'bg-muted text-foreground border-border',
  },
  {
    value: 'sent_to_venue',
    label: 'Sent to Venue',
    Icon: MailCheck,
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
  },
  {
    value: 'approved',
    label: 'Approved by Venue',
    Icon: ClipboardCheck,
    badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300',
  },
  {
    value: 'final',
    label: 'Final',
    Icon: CheckCircle2,
    badgeClass: 'bg-[#967A59]/15 text-[#7a6347] border-[#967A59]/40',
  },
];

export const labelForApproval = (s: ApprovalStatus): string =>
  APPROVAL_OPTIONS.find((o) => o.value === s)?.label ?? 'Draft';

interface Props {
  plan: ReceptionFloorPlan;
  onChange: (mutator: (p: ReceptionFloorPlan) => ReceptionFloorPlan) => void;
}

export const ApprovalStatusPanel = ({ plan, onChange }: Props) => {
  return (
    <div data-reception-approval-status="true" className="border-t border-border/40 pt-3">
      <div className="flex flex-wrap items-center gap-3 max-lg:flex-col max-lg:items-stretch">
        <div data-floor-plan-feature-heading="true" className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <ClipboardCheck className="w-4 h-4 text-[#967A59]" />
          Venue approval status
        </div>
        <div
          role="radiogroup"
          aria-label="Venue approval status"
          className="flex flex-wrap items-center gap-2 max-lg:w-full"
        >
          {APPROVAL_OPTIONS.map(({ value, label, Icon, badgeClass }) => {
            const active = plan.approval_status === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() =>
                  onChange((p) => ({ ...p, approval_status: value }))
                }
                className={cn(
                  'lv-premium-shade inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors max-lg:h-11 max-lg:flex-1 max-lg:justify-center max-lg:text-sm',
                  active
                    ? badgeClass + ' ring-2 ring-offset-1 ring-[#967A59]/60'
                    : 'bg-background text-muted-foreground border-border hover:border-[#967A59]/60'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
