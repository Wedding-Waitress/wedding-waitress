import { useState } from 'react';
import { Wand2, Loader2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { autoArrangeReception } from '@/lib/receptionAutoLayout';
import type { ReceptionFloorPlan } from '@/hooks/useReceptionFloorPlan';
import type { ReceptionTable } from '@/hooks/useReceptionTables';

interface Props {
  plan: ReceptionFloorPlan;
  tables: ReceptionTable[];
  onApply: (mutator: (p: ReceptionFloorPlan) => ReceptionFloorPlan) => void;
}

/**
 * Phase final — Smart Auto-Layout (deterministic).
 * Arranges all unlocked / unplaced tables on a tidy grid inside the room while
 * avoiding fixtures, room boundary, and locked tables. Never blocks the user.
 */
export const AutoLayoutPanel = ({ plan, tables, onApply }: Props) => {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const handleRun = () => {
    setBusy(true);
    try {
      const result = autoArrangeReception(plan, tables);
      onApply((p) => ({ ...p, table_positions: result.positions }));
      toast({
        title: 'Smart layout applied',
        description:
          result.skipped > 0
            ? `Placed ${result.placed} tables. ${result.skipped} couldn't fit — try a bigger room or fewer fixtures.`
            : `Placed ${result.placed} tables on a tidy grid. Locked tables were preserved.`,
      });
    } catch (e) {
      console.error('auto layout', e);
      toast({
        title: 'Could not auto-arrange',
        description: 'Please try again or place tables manually.',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  const totalPlaceable = tables.length;
  const disabled = busy || totalPlaceable === 0;

  return (
    <div data-reception-panel="true" className="flex h-full min-w-0 flex-col items-stretch gap-3 rounded-lg border border-border bg-muted/10 p-3 max-lg:p-4">
      <div data-floor-plan-feature-heading="true" className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Wand2 className="w-4 h-4 text-primary" />
        Smart layout
        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="top" className="reception-portal-surface max-w-xs text-xs">
              Auto-arranges unlocked tables in a clean grid, avoiding the dance floor,
              bar, stage and other fixtures. Locked tables stay where you put them.
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <p className="text-xs text-muted-foreground">
        One-click tidy arrangement that respects fixtures and locks.
      </p>
      <Button
        size="sm"
        className="lv-premium-shade mt-auto min-h-9 w-full bg-[#967A59] text-white hover:bg-[#7a6347] max-lg:min-h-11 max-lg:text-base"
        onClick={handleRun}
        disabled={disabled}
      >
        {busy ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5 mr-1.5" />}
        {busy ? 'Arranging…' : 'Auto-arrange tables'}
      </Button>
    </div>
  );
};
