import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { MapPin, CheckCircle2, Trash2, X, Mail, Phone } from "lucide-react";

interface GuestBulkActionsBarProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onAssignTable: () => void;
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
  onAssignTable,
  onUpdateRsvp,
  onDelete,
  onCancel,
  onSendEmail,
  onSendSms
}: GuestBulkActionsBarProps) => {
  const allSelected = selectedCount === totalCount;

  return (
    <div 
      className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 
                 bg-gradient-to-r from-purple-500 to-purple-600 
                 text-white rounded-lg shadow-2xl px-6 py-4 
                 flex items-center gap-4 animate-in slide-in-from-bottom-5 
                 max-w-[90vw] flex-wrap"
    >
      {/* Selection info */}
      <div className="flex items-center gap-2">
        <span className="font-semibold text-lg">{selectedCount}</span>
        <span className="text-white/90">selected</span>
      </div>

      <Separator orientation="vertical" className="h-8 bg-white/20" />

      {/* Select All / Deselect All */}
      <Button 
        variant="ghost" 
        size="sm"
        onClick={allSelected ? onDeselectAll : onSelectAll}
        className="text-white hover:bg-white/20"
      >
        {allSelected ? 'Deselect All' : 'Select All'}
      </Button>

      <Separator orientation="vertical" className="h-8 bg-white/20" />

      {/* Bulk Actions */}
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={onAssignTable}
        className="text-white hover:bg-white/20"
      >
        <MapPin className="w-4 h-4 mr-2" />
        Assign Table
      </Button>
      
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={onUpdateRsvp}
        className="text-white hover:bg-white/20"
      >
        <CheckCircle2 className="w-4 h-4 mr-2" />
        Update RSVP
      </Button>
      
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={onDelete}
        className="text-white hover:bg-white/20 hover:bg-red-500/20"
      >
        <Trash2 className="w-4 h-4 mr-2" />
        Delete
      </Button>

      <Separator orientation="vertical" className="h-8 bg-white/20" />

      {/* Send Email/SMS Actions */}
      {onSendEmail && (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onSendEmail}
          className="text-white hover:bg-blue-500/30"
        >
          <Mail className="w-4 h-4 mr-2" />
          Send Email
        </Button>
      )}
      
      {onSendSms && (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onSendSms}
          className="text-white hover:bg-green-500/30"
        >
          <Phone className="w-4 h-4 mr-2" />
          Send SMS
        </Button>
      )}

      <Separator orientation="vertical" className="h-8 bg-white/20" />

      {/* Cancel */}
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={onCancel}
        className="text-white hover:bg-white/20"
      >
        <X className="w-4 h-4 mr-2" />
        Cancel
      </Button>
    </div>
  );
};
