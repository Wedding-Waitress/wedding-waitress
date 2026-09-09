import React from 'react';
import { CreditCard, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSmsTopup } from '@/hooks/useSmsTopup';
import {
  COMMUNICATION_CREDIT_PACKS,
  type CommunicationCreditPackKey,
} from '@/lib/stripePrices';
import { cn } from '@/lib/utils';
import styles from './CommunicationCreditPackOptions.module.css';

interface Props {
  eventId: string;
  canPurchase?: boolean;
  compact?: boolean;
  className?: string;
}

const PACK_ORDER: CommunicationCreditPackKey[] = ['credits_10', 'credits_100'];

export const CommunicationCreditPackOptions: React.FC<Props> = ({
  eventId,
  canPurchase = true,
  compact = false,
  className,
}) => {
  const { startTopup, loading, activePack } = useSmsTopup();

  if (!canPurchase) {
    return (
      <p className={cn(styles.ineligible, compact && styles.compact, className)}>
        Credit top-ups require an active Essential, Premium or Ultimate plan.
      </p>
    );
  }

  return (
    <div
      className={cn(styles.options, compact && styles.compact, className)}
      aria-label="Shared Email and SMS credit purchase options"
    >
      <span className={styles.prompt}>Add shared Email &amp; SMS credits:</span>
      <div className={styles.buttons}>
        {PACK_ORDER.map((packKey) => {
          const pack = COMMUNICATION_CREDIT_PACKS[packKey];
          const isActive = loading && activePack === packKey;
          return (
            <Button
              key={pack.key}
              type="button"
              size="sm"
              className={styles.packButton}
              disabled={loading}
              onClick={() => startTopup(eventId, packKey)}
              aria-label={`Buy ${pack.credits} shared Email and SMS credits for A$${pack.price_aud}`}
            >
              {isActive ? (
                <Loader2 size={14} className={styles.spinner} aria-hidden="true" />
              ) : (
                <CreditCard size={14} aria-hidden="true" />
              )}
              <span>{pack.credits} for A${pack.price_aud}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
};

export default CommunicationCreditPackOptions;
