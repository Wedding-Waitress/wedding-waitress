import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Users, Heart } from 'lucide-react';

interface GroupTypeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'couple' | 'family') => void;
  guestNames: string[];
  totalMembers: number;
}

export const GroupTypeDialog: React.FC<GroupTypeDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  guestNames,
  totalMembers,
}) => {
  const canBeCouple = totalMembers === 2;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>How would you like to group these guests?</DialogTitle>
          <DialogDescription>
            {guestNames.join(', ')} will be linked together.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 pt-2">
          <Button
            variant="outline"
            className={`h-auto py-4 px-4 flex items-center gap-3 justify-start border-2 ${canBeCouple ? 'border-orange-500 hover:bg-orange-50' : 'opacity-50 cursor-not-allowed'}`}
            disabled={!canBeCouple}
            onClick={() => onConfirm('couple')}
          >
            <Heart className="h-5 w-5 text-orange-500 shrink-0" />
            <div className="text-left">
              <div className="font-semibold text-sm">Couple</div>
              <div className="text-xs text-muted-foreground">Exactly 2 people</div>
            </div>
          </Button>

          <Button
            variant="outline"
            className="h-auto py-4 px-4 flex items-center gap-3 justify-start border-2 border-blue-600 hover:bg-blue-50"
            onClick={() => onConfirm('family')}
          >
            <Users className="h-5 w-5 text-blue-500 shrink-0" />
            <div className="text-left">
              <div className="font-semibold text-sm">Family</div>
              <div className="text-xs text-muted-foreground">3 or more people</div>
            </div>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
