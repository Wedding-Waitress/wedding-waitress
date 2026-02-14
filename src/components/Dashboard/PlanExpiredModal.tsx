import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, Sparkles } from "lucide-react";

interface PlanExpiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: () => void;
}

export const PlanExpiredModal: React.FC<PlanExpiredModalProps> = ({
  isOpen,
  onClose,
  onUpgrade,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="w-6 h-6 text-amber-500" />
            <DialogTitle className="text-lg">Free Trial Expired</DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            Your 24-hour free trial has ended. Upgrade to a paid plan to continue 
            managing your event with unlimited access.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium">With an upgraded plan you get:</p>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• Up to 100, 300, or unlimited guests</li>
              <li>• Unlimited tables & seating charts</li>
              <li>• QR code guest lookup</li>
              <li>• Place cards, dietary charts & more</li>
              <li>• 12-month access</li>
            </ul>
          </div>

          <div className="border rounded-lg p-3 text-center">
            <p className="text-sm text-muted-foreground">Plans starting from</p>
            <p className="text-2xl font-bold text-primary">$99 AUD</p>
            <p className="text-xs text-muted-foreground">one-time payment</p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} className="rounded-full">
            Maybe Later
          </Button>
          <Button
            onClick={onUpgrade}
            className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Choose a Plan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
