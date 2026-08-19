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
import styles from './AccountDialog.module.css';
import controlStyles from './AccountControls.module.css';

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
      <DialogContent data-appearance="espresso-glass" className={`sm:max-w-md ${styles.dialog}`} overlayClassName={styles.overlay}>
        <DialogHeader className="text-center sm:text-left">
          <div className={`${styles.iconWrap} mx-auto sm:mx-0`}>
            <Sparkles className="h-6 w-6" />
          </div>
          <DialogTitle className={styles.title}>
            {title}
          </DialogTitle>
          <DialogDescription className={`${styles.description} text-sm leading-relaxed pt-1`}>
            User invitations and collaboration controls are currently being finalized.
            You&rsquo;ll be able to invite collaborators and assign access here soon.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className={`${styles.actions} mt-2`}>
          <Button
            onClick={() => onOpenChange(false)}
            className={`${controlStyles.primaryButton} w-full sm:w-auto`}
          >
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
