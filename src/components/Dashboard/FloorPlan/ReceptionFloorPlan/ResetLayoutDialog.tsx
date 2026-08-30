import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { AlertTriangle } from 'lucide-react';

type ResetScope = 'tables' | 'fixtures' | 'all';

interface ResetLayoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (scope: ResetScope) => void;
  tableCount: number;
  fixtureCount: number;
}

export const ResetLayoutDialog = ({
  open,
  onOpenChange,
  onConfirm,
  tableCount,
  fixtureCount,
}: ResetLayoutDialogProps) => {
  const [scope, setScope] = useState<ResetScope>('tables');
  const [confirming, setConfirming] = useState(false);

  const handleClose = (next: boolean) => {
    if (!next) {
      setConfirming(false);
      setScope('tables');
    }
    onOpenChange(next);
  };

  const handleProceed = () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    onConfirm(scope);
    handleClose(false);
  };

  const scopeLabel =
    scope === 'tables'
      ? `all ${tableCount} placed table${tableCount === 1 ? '' : 's'} (tables return to the unplaced tray)`
      : scope === 'fixtures'
      ? `all ${fixtureCount} fixture${fixtureCount === 1 ? '' : 's'}`
      : `everything (${tableCount} table${tableCount === 1 ? '' : 's'} + ${fixtureCount} fixture${fixtureCount === 1 ? '' : 's'})`;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="reception-portal-surface max-w-md max-lg:px-3">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-center max-lg:justify-center">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            Reset Reception Layout
          </DialogTitle>
          <DialogDescription>
            Choose what to reset. Synced tables and your guest list are never affected — only
            their positions on the floor plan.
          </DialogDescription>
        </DialogHeader>

        {!confirming ? (
          <RadioGroup
            value={scope}
            onValueChange={(v) => setScope(v as ResetScope)}
            className="space-y-3 py-2"
          >
            <label
              htmlFor="reset-tables"
              className="flex items-start gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/40"
            >
              <RadioGroupItem id="reset-tables" value="tables" className="mt-0.5" />
              <div className="space-y-0.5">
                <div className="text-sm font-medium">Only table positions</div>
                <div className="text-xs text-muted-foreground">
                  Removes {tableCount} placed table{tableCount === 1 ? '' : 's'} from the room.
                  Fixtures stay where they are.
                </div>
              </div>
            </label>

            <label
              htmlFor="reset-fixtures"
              className="flex items-start gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/40"
            >
              <RadioGroupItem id="reset-fixtures" value="fixtures" className="mt-0.5" />
              <div className="space-y-0.5">
                <div className="text-sm font-medium">Only fixtures</div>
                <div className="text-xs text-muted-foreground">
                  Deletes {fixtureCount} fixture{fixtureCount === 1 ? '' : 's'} (stage, bar, dance
                  floor, etc.). Tables stay where they are.
                </div>
              </div>
            </label>

            <label
              htmlFor="reset-all"
              className="flex items-start gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/40"
            >
              <RadioGroupItem id="reset-all" value="all" className="mt-0.5" />
              <div className="space-y-0.5">
                <div className="text-sm font-medium">Entire reception floor plan</div>
                <div className="text-xs text-muted-foreground">
                  Clears all placed tables and all fixtures. Room dimensions stay.
                </div>
              </div>
            </label>
          </RadioGroup>
        ) : (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            You're about to reset {scopeLabel}. This cannot be undone. Continue?
          </div>
        )}

        <DialogFooter className="max-lg:flex-row max-lg:gap-2 max-lg:px-3">
          <Button
            variant="default"
            className="lv-premium-shade max-lg:flex-1 max-lg:h-11 bg-green-600 hover:bg-green-700 text-white"
            onClick={handleProceed}
          >
            {confirming ? 'Yes, reset now' : 'Continue'}
          </Button>
          <Button
            variant="outline"
            className="lv-premium-shade max-lg:flex-1 max-lg:h-11 border-red-300 text-red-700 hover:bg-red-50"
            onClick={() => handleClose(false)}
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
