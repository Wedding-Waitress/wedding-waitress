/**
 * PRODUCTION-READY -- LOCKED FOR PRODUCTION
 *
 * The Guest List page feature is COMPLETE and APPROVED for production use.
 *
 * CRITICAL RULES:
 * - DO NOT modify without explicit owner approval
 * - Changes could break guest list management
 * - Changes could break bulk actions and RSVP workflows
 * - Changes could break real-time synchronisation
 *
 * Last locked: 2026-02-19
 */
import { Button } from "@/components/ui/button";
import { CheckCircle2, Trash2, X, Mail, Phone } from "lucide-react";

interface GuestBulkActionsBarProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onUpdateRsvp: () => void;
  onDelete: () => void;
  onCancel: () => void;
  onSendEmail?: () => void;
  onSendSms?: () => void;
}

export const GuestBulkActionsBar = ({
  selectedCount,
  totalCount,
  onSelectAll,
  onDeselectAll,
  onUpdateRsvp,
  onDelete,
  onCancel,
  onSendEmail,
  onSendSms
}: GuestBulkActionsBarProps) => {
  const allSelected = selectedCount === totalCount;

  return (
    <div 
      className="fixed bottom-28 left-1/2 transform -translate-x-1/2 z-50 
                 bg-gradient-to-r from-purple-500 to-purple-600 
                 text-white rounded-lg shadow-2xl px-4 py-3 
                 flex items-center gap-2 animate-in slide-in-from-bottom-5 
                 max-w-[90vw]"
    >
      <div className="flex items-center gap-1">
        <span className="font-semibold text-lg">{selectedCount}</span>
        <span className="text-white/90 text-sm">selected</span>
      </div>

      <Button 
        variant="ghost" 
        size="sm"
        onClick={allSelected ? onDeselectAll : onSelectAll}
        className="text-white hover:bg-white/20 text-sm"
      >
        {allSelected ? 'Deselect All' : 'Select All'}
      </Button>

      <Button 
        variant="ghost" 
        size="sm" 
        onClick={onUpdateRsvp}
        className="text-white hover:bg-white/20 text-sm"
      >
        <CheckCircle2 className="w-4 h-4 mr-1" />
        Update RSVP
      </Button>
      
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={onDelete}
        className="text-white hover:bg-white/20 hover:bg-red-500/20 text-sm"
      >
        <Trash2 className="w-4 h-4 mr-1" />
        Delete
      </Button>

      {onSendEmail && (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onSendEmail}
          className="text-white hover:bg-blue-500/30 text-sm"
        >
          <Mail className="w-4 h-4 mr-1" />
          Send Email
        </Button>
      )}
      
      {onSendSms && (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onSendSms}
          className="text-white hover:bg-green-500/30 text-sm"
        >
          <Phone className="w-4 h-4 mr-1" />
          Send SMS
        </Button>
      )}

      <Button 
        variant="ghost" 
        size="sm" 
        onClick={onCancel}
        className="text-white hover:bg-white/20 text-sm"
      >
        <X className="w-4 h-4 mr-1" />
        Cancel
      </Button>
    </div>
  );
};
