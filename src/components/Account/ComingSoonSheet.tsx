import React from 'react';
import { Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
}

export const ComingSoonSheet: React.FC<Props> = ({
  open,
  onOpenChange,
  title = 'Coming Soon',
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-gradient-to-b from-white to-[#FBF7F0] border-[#E8E1D6]">
        <DialogHeader className="text-center sm:text-left">
          <div className="mx-auto sm:mx-0 mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#C9A87A]/30 to-[#967A59]/20 text-[#7d6649] ring-1 ring-[#967A59]/15">
            <Sparkles className="h-6 w-6" />
          </div>
          <DialogTitle className="text-xl font-semibold text-[#7d6649]">
            {title}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground leading-relaxed pt-1">
            User invitations and collaboration controls are currently being finalized.
            You&rsquo;ll be able to invite collaborators and assign access here soon.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-2">
          <Button
            onClick={() => onOpenChange(false)}
            className="lv-premium-shade w-full sm:w-auto bg-gradient-to-r from-[#B8946A] via-[#967A59] to-[#7d6649] hover:from-[#A88560] hover:via-[#7d6649] hover:to-[#6a5640] text-white rounded-full"
          >
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
