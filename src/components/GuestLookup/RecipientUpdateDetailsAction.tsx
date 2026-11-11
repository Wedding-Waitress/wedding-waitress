import { SquarePen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import styles from './GuestUpdateModal.module.css';

interface RecipientUpdateDetailsActionProps {
  onClick: () => void;
  desktopOnly?: boolean;
}

/**
 * The sole public RSVP update action. Its parent decides whether the current
 * guest is the invitation recipient; this component deliberately has no
 * breakpoint-specific visibility behaviour.
 */
export const RecipientUpdateDetailsAction = ({ onClick, desktopOnly = false }: RecipientUpdateDetailsActionProps) => (
  <div
    className={`flex justify-center pt-3${desktopOnly ? ' recipient-update-action--desktop' : ''}`}
    data-recipient-update-action
  >
    <Button
      type="button"
      onClick={onClick}
      className={`guest-rsvp-action bg-green-500 text-white px-6 py-2 rounded-lg ${styles.saveButton}`}
    >
      <SquarePen aria-hidden="true" className="mr-2 h-5 w-5 shrink-0 text-white" />
      Update My Details
    </Button>
  </div>
);
