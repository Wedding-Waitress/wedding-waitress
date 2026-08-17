import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Mail, Phone, Send, Search, X } from "lucide-react";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

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
  allGuests?: SelectedGuest[];
  onSelectGuests?: (ids: string[]) => void;
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
  allGuests = [],
  onSelectGuests,
  onSelectAll,
  onDeselectAll,
  onUpdateRsvp,
  onDelete,
  onSendEmail,
  onSendSms,
  onMarkManualInvite,
}: GuestBulkActionsBarProps) => {
  const allSelected = selectedCount === totalCount;

  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [draftIds, setDraftIds] = useState<Set<string>>(new Set());

  // Sync draft with current selection whenever picker opens
  useEffect(() => {
    if (pickerOpen) {
      setDraftIds(new Set(selectedGuests.map((g) => g.id)));
      setSearch("");
    }
  }, [pickerOpen]);

  const filteredGuests = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allGuests;
    return allGuests.filter((g) =>
      `${g.first_name} ${g.last_name}`.toLowerCase().includes(q)
    );
  }, [allGuests, search]);

  const toggleDraft = (id: string) => {
    setDraftIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAddSelected = () => {
    onSelectGuests?.(Array.from(draftIds));
    setPickerOpen(false);
  };

  const getSelectedText = () => {
    if (selectedGuests.length === 0) return '';
    if (selectedGuests.length <= 3) {
      return `Selected: ${selectedGuests.map(g => `${g.first_name} ${g.last_name}`).join(', ')}`;
    }
    return `${selectedCount} guests selected`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="ww-guest-list-dialog sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-center mt-6">Manage Selected Guests</DialogTitle>
          <DialogDescription className="text-sm font-medium mt-7 text-[#5C4A36] whitespace-pre-line text-left">
            1. Send RSVP's / Invites to “All your guests” below.{"\n"}
            2. Select one guest only, back in the guest list table.{"\n"}
            3. Add multiple guests to send RSVP / Invites from the search bar below.
          </DialogDescription>
          {getSelectedText() && (
            <p className="text-sm font-medium text-center mt-4 text-green-600">{getSelectedText()}</p>
          )}
        </DialogHeader>

        <div className="grid gap-2 py-4">
          {/* Search & add multiple guests */}
          {onSelectGuests && allGuests.length > 0 && (
            <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="p-3 rounded-lg border-2 border-[#967A59]/70 hover:border-[#967A59] flex items-center gap-3 transition-colors text-left h-11 bg-background"
                >
                  <Search className="w-5 h-5 text-[#967A59] shrink-0" />
                  <span className="text-sm font-medium text-[#5C4A36]/80">
                    Search and add guests...
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                sideOffset={6}
                className="ww-guest-list-menu w-[calc(425px-3rem)] max-w-[calc(100vw-3rem)] p-0 border-2 border-[#967A59]/70 rounded-lg"
              >
                <div className="p-2 border-b border-[#967A59]/30">
                  <div className="relative">
                    <Search className="w-4 h-4 text-[#967A59] absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <Input
                      autoFocus
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Type a guest name..."
                      className="h-10 pl-8 text-sm border-[#967A59]/40 focus-visible:ring-[#967A59]/30"
                    />
                  </div>
                </div>
                <div className="max-h-[240px] overflow-y-auto py-1">
                  {filteredGuests.length === 0 ? (
                    <div className="px-3 py-6 text-center text-sm text-[#6E6E73]">
                      No guests found.
                    </div>
                  ) : (
                    filteredGuests.map((g) => {
                      const checked = draftIds.has(g.id);
                      return (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => toggleDraft(g.id)}
                          className="w-full flex items-center gap-3 px-3 py-2 hover:bg-[#967A59]/5 text-left"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => toggleDraft(g.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <span
                            className={`text-sm ${
                              checked
                                ? "text-green-600 font-medium"
                                : "text-foreground"
                            }`}
                          >
                            {g.first_name} {g.last_name}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
                <div className="flex items-center justify-end gap-2 p-2 border-t border-[#967A59]/30">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPickerOpen(false)}
                    className="h-9"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddSelected}
                    className="h-9 bg-green-600 hover:bg-green-700 text-white"
                  >
                    Add Selected ({draftIds.size})
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          )}

          {/* Select All Guests (styled like action rows; only checkbox is clickable) */}
          <div className="p-3 rounded-lg border-2 border-[#967A59]/70 flex items-center gap-3">
            <Checkbox
              checked={allSelected}
              onCheckedChange={() => (allSelected ? onDeselectAll() : onSelectAll())}
              className="cursor-pointer"
            />
            <span className="text-sm font-medium text-foreground">Select All Guests</span>
          </div>

          {/* Send Email or SMS via Wedding Waitress (combined) */}
          {onSendEmail && (
            <button
              onClick={onSendEmail}
              className="p-3 rounded-lg border-2 border-[#967A59]/70 hover:border-[#967A59] hover:bg-[#967A59]/5 cursor-pointer flex items-center gap-3 transition-colors text-left"
            >
              <Mail className="w-5 h-5 text-blue-500" />
              <Phone className="w-5 h-5 text-green-500" />
              <span className="text-sm font-medium text-foreground">Send Email or SMS via Wedding Waitress</span>
            </button>
          )}

          {/* Mark Invite as Sent Manually */}
          <div className="p-3 rounded-lg border-2 border-[#967A59]/70 flex items-center gap-3">
            <Send className="w-5 h-5 text-[#967A59] shrink-0" />
            <div className="flex flex-col gap-1.5 flex-1">
              <span className="text-sm font-medium text-foreground">Mark RSVP / Invite as sent manually</span>
              <Select onValueChange={(value) => onMarkManualInvite(value)}>
                <SelectTrigger className="h-9 text-xs border-2 border-[#967A59]/70">
                  <SelectValue placeholder="Select method..." />
                </SelectTrigger>
                <SelectContent className="ww-guest-list-menu">
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
