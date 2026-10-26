import React from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AccountRenewalPackages } from '@/components/Account/AccountRenewalPackages';

interface PlanExpiredModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/** Reuse the consented renewal flow; expiry never extends a trial or starts payment. */
export const PlanExpiredModal: React.FC<PlanExpiredModalProps> = ({ isOpen, onClose }) => (
  <Dialog open={isOpen} onOpenChange={onClose}>
    <DialogContent className="max-h-[90svh] max-w-lg overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Free Trial Expired</DialogTitle>
        <DialogDescription>Choose a package to continue planning. Your saved information remains retained.</DialogDescription>
      </DialogHeader>
      <AccountRenewalPackages reason="trial-ended" />
      <DialogFooter>
        <Button variant="outline" onClick={onClose} className="rounded-full">Maybe Later</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
