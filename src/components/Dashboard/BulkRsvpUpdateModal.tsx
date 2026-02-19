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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import type { Guest } from "@/hooks/useGuests";

interface BulkRsvpUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedGuests: Guest[];
  onConfirm: (newStatus: string) => Promise<void>;
}

export const BulkRsvpUpdateModal = ({
  isOpen,
  onClose,
  selectedGuests,
  onConfirm,
}: BulkRsvpUpdateModalProps) => {
  const [newStatus, setNewStatus] = useState<string>("Attending");
  const [loading, setLoading] = useState(false);

  // Calculate current status breakdown
  const statusBreakdown = {
    Pending: selectedGuests.filter(g => g.rsvp === 'Pending').length,
    Attending: selectedGuests.filter(g => g.rsvp === 'Attending').length,
    'Not Attending': selectedGuests.filter(g => g.rsvp === 'Not Attending').length,
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm(newStatus);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Update RSVP Status for {selectedGuests.length} Guests</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Status Breakdown */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Current Status Breakdown</Label>
            <div className="flex gap-2 flex-wrap">
              {statusBreakdown.Pending > 0 && (
                <Badge variant="secondary">
                  {statusBreakdown.Pending} Pending
                </Badge>
              )}
              {statusBreakdown.Attending > 0 && (
                <Badge className="bg-green-500 hover:bg-green-600">
                  {statusBreakdown.Attending} Attending
                </Badge>
              )}
              {statusBreakdown['Not Attending'] > 0 && (
                <Badge variant="destructive">
                  {statusBreakdown['Not Attending']} Not Attending
                </Badge>
              )}
            </div>
          </div>

          {/* New Status Selector */}
          <div>
            <Label className="text-sm font-medium mb-3 block">New RSVP Status</Label>
            <RadioGroup value={newStatus} onValueChange={setNewStatus}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Pending" id="pending" />
                <Label htmlFor="pending" className="font-normal cursor-pointer">
                  Pending
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Attending" id="attending" />
                <Label htmlFor="attending" className="font-normal cursor-pointer">
                  Attending
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Not Attending" id="not-attending" />
                <Label htmlFor="not-attending" className="font-normal cursor-pointer">
                  Not Attending
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Guest Preview */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Affected Guests</Label>
            <ScrollArea className="h-40 rounded-md border p-4">
              <div className="space-y-2">
                {selectedGuests.map((guest) => (
                  <div key={guest.id} className="flex justify-between text-sm">
                    <span>{guest.first_name} {guest.last_name}</span>
                    <span className="text-muted-foreground">{guest.rsvp} → {newStatus}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Preview Summary */}
          <div className="bg-purple-50 dark:bg-purple-950 rounded-lg p-4">
            <p className="text-sm font-medium text-purple-900 dark:text-purple-100">
              {selectedGuests.length} guests will be updated to "{newStatus}"
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={loading}
            className="bg-purple-500 hover:bg-purple-600"
          >
            {loading ? "Updating..." : "Update RSVP"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
