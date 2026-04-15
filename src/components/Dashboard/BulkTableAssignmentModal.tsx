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
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { Guest } from "@/hooks/useGuests";
import type { TableWithGuestCount } from "@/hooks/useTables";

interface BulkTableAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedGuests: Guest[];
  tables: TableWithGuestCount[];
  onConfirm: (tableId: string, assignSeats: boolean) => Promise<void>;
}

export const BulkTableAssignmentModal = ({
  isOpen,
  onClose,
  selectedGuests,
  tables,
  onConfirm,
}: BulkTableAssignmentModalProps) => {
  const [selectedTableId, setSelectedTableId] = useState<string>("");
  const [assignSeats, setAssignSeats] = useState(true);
  const [loading, setLoading] = useState(false);

  const selectedTable = tables.find(t => t.id === selectedTableId);
  const currentGuestCount = selectedTable?.guest_count || 0;
  const capacity = selectedTable?.limit_seats || 0;
  const willOverAssign = currentGuestCount + selectedGuests.length > capacity;
  const overAssignCount = currentGuestCount + selectedGuests.length - capacity;

  const handleConfirm = async () => {
    if (!selectedTableId) return;
    
    setLoading(true);
    try {
      await onConfirm(selectedTableId, assignSeats);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Assign {selectedGuests.length} Guests to Table</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Guest Preview */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Selected Guests</Label>
            <ScrollArea className="h-32 rounded-md border p-4">
              <div className="space-y-1">
                {selectedGuests.map((guest) => (
                  <div key={guest.id} className="text-sm">
                    {guest.first_name} {guest.last_name}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Table Selector */}
          <div>
            <Label htmlFor="table-select" className="text-sm font-medium mb-2 block">
              Destination Table
            </Label>
            <Select value={selectedTableId} onValueChange={setSelectedTableId}>
              <SelectTrigger id="table-select">
                <SelectValue placeholder="Choose a table..." />
              </SelectTrigger>
              <SelectContent>
                {tables.map((table) => {
                  const tableGuestCount = table.guest_count || 0;
                  const tableCapacity = table.limit_seats;
                  const isFull = tableGuestCount >= tableCapacity;
                  
                  return (
                    <SelectItem key={table.id} value={table.id}>
                      {table.name} ({tableGuestCount}/{tableCapacity})
                      {isFull && " - Full"}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Capacity Warning */}
          {selectedTableId && willOverAssign && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                ⚠️ {selectedTable?.name} will be over capacity by {overAssignCount} guests 
                ({currentGuestCount + selectedGuests.length}/{capacity})
              </AlertDescription>
            </Alert>
          )}

          {/* Seat Assignment Option */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="assign-seats"
              checked={assignSeats}
              onCheckedChange={(checked) => setAssignSeats(checked as boolean)}
            />
            <Label
              htmlFor="assign-seats"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Auto-assign seat numbers (sequential from next available)
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={!selectedTableId || loading}
            className="bg-[#F5F0EB]0 hover:bg-[#856A4C]"
          >
            {loading ? "Assigning..." : `Assign to ${selectedTable?.name || "Table"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
