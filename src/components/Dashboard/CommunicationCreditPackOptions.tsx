import React from 'react';
import { usePaymentProcessing } from '@/contexts/PaymentProcessingContext';
import { CreditCard, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CommunicationTopupNotice } from './CommunicationTopupNotice';
import { useSmsTopup } from '@/hooks/useSmsTopup';
import {
  COMMUNICATION_CREDIT_PACKS,
  type CommunicationCreditPackKey,
} from '@/lib/stripePrices';
import { cn } from '@/lib/utils';
import styles from './CommunicationCreditPackOptions.module.css';
import { gstInclusiveAud } from '@/lib/packagePricing';
import { formatLivePrice } from '@/lib/liveCurrencyPricing';

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
  const { startTopup, loading, activePack, eligibility, retryEligibility } = useSmsTopup(eventId);

  const { processing } = usePaymentProcessing();

  if (eligibility.status !== 'eligible') return <CommunicationTopupNotice eligibility={eligibility} retry={retryEligibility} />;

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
          const total = formatLivePrice('AUD', gstInclusiveAud(pack.price_aud));
          const isActive = loading && activePack === packKey;
          return (
            <Button
              key={pack.key}
              type="button"
              size="sm"
              className={styles.packButton}
              disabled={loading || processing}
              onClick={() => startTopup(eventId, packKey)}
              aria-label={`Buy ${pack.credits} shared Email and SMS credits for ${total} including GST`}
            >
              {isActive ? (
                <Loader2 size={14} className={styles.spinner} aria-hidden="true" />
              ) : (
                <CreditCard size={14} aria-hidden="true" />
              )}
              <span>{pack.credits} for {total} including GST</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
};

export default CommunicationCreditPackOptions;
