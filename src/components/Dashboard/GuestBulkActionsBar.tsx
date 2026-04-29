import { Button } from "@/components/ui/button";
import { CheckCircle2, Trash2, Mail, Phone, CheckSquare, Send } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SelectedGuest {
  id: string;
  first_name: string;
  last_name: string;
}

interface GuestBulkActionsBarProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCount: number;
  totalCount: number;
  selectedGuests: SelectedGuest[];
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onUpdateRsvp: () => void;
  onDelete: () => void;
  onSendEmail?: () => void;
  onSendSms?: () => void;
  onMarkManualInvite: (method: string) => void;
}

export const GuestBulkActionsBar = ({
  isOpen,
  onClose,
  selectedCount,
  totalCount,
  selectedGuests,
  onSelectAll,
  onDeselectAll,
  onUpdateRsvp,
  onDelete,
  onSendEmail,
  onSendSms,
  onMarkManualInvite,
}: GuestBulkActionsBarProps) => {
  const allSelected = selectedCount === totalCount;

  const getSelectedText = () => {
    if (selectedGuests.length === 0) return '';
    if (selectedGuests.length <= 3) {
      return `Selected: ${selectedGuests.map(g => `${g.first_name} ${g.last_name}`).join(', ')}`;
    }
    return `${selectedCount} guests selected`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex flex-col gap-3 pr-8">
            <div>
              <DialogTitle className="text-lg font-semibold">Manage Selected Guests</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">{getSelectedText()}</p>
            </div>
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={allSelected ? onDeselectAll : onSelectAll}
                className="shrink-0"
              >
                <CheckSquare className="w-4 h-4 mr-1" />
                {allSelected ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
          </div>
          <DialogDescription>Apply actions to your selected guests</DialogDescription>
        </DialogHeader>

        <div className="grid gap-2 py-4">
          {/* Update RSVP */}
          <button
            onClick={onUpdateRsvp}
            className="p-3 rounded-lg border-2 border-[#967A59]/70 hover:border-[#967A59] hover:bg-[#967A59]/5 cursor-pointer flex items-center gap-3 transition-colors text-left"
          >
            <CheckCircle2 className="w-5 h-5 text-[#967A59]" />
            <span className="text-sm font-medium text-foreground">Update RSVP</span>
          </button>

          {/* Send Email via Wedding Waitress */}
          {onSendEmail && (
            <button
              onClick={onSendEmail}
              className="p-3 rounded-lg border-2 border-[#967A59]/70 hover:border-[#967A59] hover:bg-[#967A59]/5 cursor-pointer flex items-center gap-3 transition-colors text-left"
            >
              <Mail className="w-5 h-5 text-blue-500" />
              <span className="text-sm font-medium text-foreground">Send Email via Wedding Waitress</span>
            </button>
          )}

          {/* Send SMS via Wedding Waitress */}
          {onSendSms && (
            <button
              onClick={onSendSms}
              className="p-3 rounded-lg border-2 border-[#967A59]/70 hover:border-[#967A59] hover:bg-[#967A59]/5 cursor-pointer flex items-center gap-3 transition-colors text-left"
            >
              <Phone className="w-5 h-5 text-green-500" />
              <span className="text-sm font-medium text-foreground">Send SMS via Wedding Waitress</span>
            </button>
          )}

          {/* Mark Invite as Sent Manually */}
          <div className="p-3 rounded-lg border-2 border-[#967A59]/70 flex items-center gap-3">
            <Send className="w-5 h-5 text-[#967A59] shrink-0" />
            <div className="flex flex-col gap-1.5 flex-1">
              <span className="text-sm font-medium text-foreground">Mark Invite as Sent Manually</span>
              <Select onValueChange={(value) => onMarkManualInvite(value)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select method..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email_sent">Sent via Email</SelectItem>
                  <SelectItem value="sms_sent">Sent via SMS</SelectItem>
                  <SelectItem value="mail_sent">Sent via Physical Mail</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Delete Guests */}
          <button
            onClick={onDelete}
            className="p-3 rounded-lg border-2 border-red-500 hover:bg-red-50 cursor-pointer flex items-center gap-3 transition-colors text-left"
          >
            <Trash2 className="w-5 h-5 text-red-600" />
            <span className="text-sm font-medium text-red-600">Delete Guests</span>
          </button>
        </div>

        <DialogFooter>
          <Button
            onClick={onClose}
            className="bg-red-600 hover:bg-red-700 text-white border-0"
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
