import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Mail, Phone, Send } from "lucide-react";
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
          <DialogTitle className="text-lg font-semibold text-center mt-6">Manage Selected Guests</DialogTitle>
          <DialogDescription className="text-sm font-medium mt-4 text-[#5C4A36] whitespace-pre-line text-left">
            1. Send RSVP's / Invites to “All your guests” below{"\n"}
            2. Select one guest only back in the guest list table{"\n"}
            3. Add multiple guests to send RSVP / Invites in from the search bar below
          </DialogDescription>
          {getSelectedText() && (
            <p className="text-sm font-medium text-center mt-4 text-green-600">{getSelectedText()}</p>
          )}
        </DialogHeader>

        <div className="grid gap-2 py-4">
          {/* Select All Guests (styled like action rows; only checkbox is clickable) */}
          <div className="p-3 rounded-lg border-2 border-[#967A59]/70 flex items-center gap-3">
            <Checkbox
              checked={allSelected}
              onCheckedChange={() => (allSelected ? onDeselectAll() : onSelectAll())}
              className="cursor-pointer"
            />
            <span className="text-sm font-medium text-foreground">Select All Guests</span>
          </div>

          {/* Send Email & SMS via Wedding Waitress (combined) */}
          {onSendEmail && (
            <button
              onClick={onSendEmail}
              className="p-3 rounded-lg border-2 border-[#967A59]/70 hover:border-[#967A59] hover:bg-[#967A59]/5 cursor-pointer flex items-center gap-3 transition-colors text-left"
            >
              <Mail className="w-5 h-5 text-blue-500" />
              <Phone className="w-5 h-5 text-green-500" />
              <span className="text-sm font-medium text-foreground">Send Email &amp; SMS via Wedding Waitress</span>
            </button>
          )}

          {/* Mark Invite as Sent Manually */}
          <div className="p-3 rounded-lg border-2 border-[#967A59]/70 flex items-center gap-3">
            <Send className="w-5 h-5 text-[#967A59] shrink-0" />
            <div className="flex flex-col gap-1.5 flex-1">
              <span className="text-sm font-medium text-foreground">Mark Invite as Sent Manually</span>
              <Select onValueChange={(value) => onMarkManualInvite(value)}>
                <SelectTrigger className="h-9 text-xs border-2 border-[#967A59]/70">
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

        </div>

        <DialogFooter className="pb-6">
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
