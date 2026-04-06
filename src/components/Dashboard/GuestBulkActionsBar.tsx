import { Button } from "@/components/ui/button";
import { CheckCircle2, Trash2, Mail, Phone, Users, CheckSquare } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface GuestBulkActionsBarProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onUpdateRsvp: () => void;
  onDelete: () => void;
  onSendEmail?: () => void;
  onSendSms?: () => void;
}

export const GuestBulkActionsBar = ({
  isOpen,
  onClose,
  selectedCount,
  totalCount,
  onSelectAll,
  onDeselectAll,
  onUpdateRsvp,
  onDelete,
  onSendEmail,
  onSendSms,
}: GuestBulkActionsBarProps) => {
  const allSelected = selectedCount === totalCount;

  const handleAction = (action: () => void) => {
    action();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle className="text-lg font-semibold">Manage Selected Guests</DialogTitle>
            <Badge variant="secondary" className="bg-primary/10 text-primary font-semibold">
              {selectedCount} selected
            </Badge>
          </div>
          <DialogDescription>Apply actions to your selected guests</DialogDescription>
        </DialogHeader>

        <div className="grid gap-2 py-4">
          {/* Select All / Deselect All */}
          <button
            onClick={() => handleAction(allSelected ? onDeselectAll : onSelectAll)}
            className="p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer flex items-center gap-3 transition-colors text-left"
          >
            <CheckSquare className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium text-foreground">
              {allSelected ? 'Deselect All' : 'Select All'}
            </span>
          </button>

          {/* Update RSVP */}
          <button
            onClick={() => handleAction(onUpdateRsvp)}
            className="p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer flex items-center gap-3 transition-colors text-left"
          >
            <CheckCircle2 className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium text-foreground">Update RSVP</span>
          </button>

          {/* Send Email */}
          {onSendEmail && (
            <button
              onClick={() => handleAction(onSendEmail)}
              className="p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer flex items-center gap-3 transition-colors text-left"
            >
              <Mail className="w-5 h-5 text-blue-500" />
              <span className="text-sm font-medium text-foreground">Send Email</span>
            </button>
          )}

          {/* Send SMS */}
          {onSendSms && (
            <button
              onClick={() => handleAction(onSendSms)}
              className="p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer flex items-center gap-3 transition-colors text-left"
            >
              <Phone className="w-5 h-5 text-green-500" />
              <span className="text-sm font-medium text-foreground">Send SMS</span>
            </button>
          )}

          {/* Delete Guests */}
          <button
            onClick={() => handleAction(onDelete)}
            className="p-3 rounded-lg border border-red-200 hover:bg-red-50 cursor-pointer flex items-center gap-3 transition-colors text-left"
          >
            <Trash2 className="w-5 h-5 text-red-600" />
            <span className="text-sm font-medium text-red-600">Delete Guests</span>
          </button>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            className="text-destructive border-destructive/30 hover:bg-destructive/10"
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
