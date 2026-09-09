import React from 'react';
import { MessageSquareText } from 'lucide-react';
import type { SmsCredits } from '@/hooks/useSmsCredits';
import { useSmsCredits } from '@/hooks/useSmsCredits';
import { useUserPlan } from '@/hooks/useUserPlan';
import { getPlanCommunicationCredits } from '@/lib/communicationCredits';
import { cn } from '@/lib/utils';
import styles from './CommunicationCreditSummaryCard.module.css';
import { CommunicationCreditPackOptions } from './CommunicationCreditPackOptions';

export interface NormalizedCommunicationCredits {
  total: number;
  used: number;
  remaining: number;
}

export type CommunicationCreditLevel = 'healthy' | 'low' | 'depleted' | 'unknown';

export const getCommunicationCreditLevel = (
  balance: NormalizedCommunicationCredits,
): CommunicationCreditLevel => {
  if (balance.total <= 0) return 'unknown';
  if (balance.remaining <= 0) return 'depleted';
  return balance.remaining <= 50 ? 'low' : 'healthy';
};

export const normalizeCommunicationCredits = (
  credits: SmsCredits,
  minimumTotal = 0,
): NormalizedCommunicationCredits => {
  const recordedTotal = Math.max(0, Math.floor(Number.isFinite(credits.total) ? credits.total : 0));
  const includedTotal = Math.max(0, Math.floor(Number.isFinite(minimumTotal) ? minimumTotal : 0));
  const total = Math.max(recordedTotal, includedTotal);
  const used = Math.min(total, Math.max(0, Math.floor(Number.isFinite(credits.used) ? credits.used : 0)));
  return { total, used, remaining: total - used };
};

const planDisplayName = (planName?: string | null) => {
  const normalized = (planName || '').trim().toLowerCase();
  if (normalized === 'unlimited' || normalized === 'ultimate') return 'Ultimate Plan';
  if (normalized === 'premium') return 'Premium Plan';
  if (normalized === 'essential') return 'Essential Plan';
  if (normalized === 'starter') return 'Starter Plan';
  return planName?.trim() || 'Current Plan';
};

interface CardProps {
  planName?: string | null;
  planIncludedCredits?: number;
  credits: SmsCredits;
  loading?: boolean;
  error?: string | null;
  className?: string;
  ariaLabel?: string;
  variant?: 'summary' | 'channel';
  eventId?: string | null;
  canPurchaseCredits?: boolean;
}

export const CommunicationCreditSummaryCard: React.FC<CardProps> = ({
  planName,
  planIncludedCredits = getPlanCommunicationCredits(planName),
  credits,
  loading = false,
  error = null,
  className,
  ariaLabel = 'Shared Email and SMS credit summary',
  variant = 'summary',
  eventId,
  canPurchaseCredits = true,
}) => {
  // The ledger remains authoritative for usage and purchased top-ups. The plan
  // allowance is a floor because platform-owner/test accounts may not have the
  // ordinary subscription row that the RPC uses to seed an event's allowance.
  const balance = normalizeCommunicationCredits(credits, planIncludedCredits);
  const purchasedCredits = Math.max(0, balance.total - Math.max(0, planIncludedCredits));
  const creditLevel = loading || error ? 'unknown' : getCommunicationCreditLevel(balance);

  if (variant === 'channel') {
    return (
      <aside
        className={cn(
          styles.channelCard,
          creditLevel === 'healthy' && styles.channelHealthy,
          creditLevel === 'low' && styles.channelLow,
          creditLevel === 'depleted' && styles.channelDepleted,
          creditLevel === 'unknown' && styles.channelUnknown,
          className,
        )}
        data-credit-level={creditLevel}
        aria-label={ariaLabel}
        aria-live="polite"
      >
        <span className={styles.channelIcon} aria-hidden="true"><MessageSquareText size={18} strokeWidth={1.8} /></span>
        <span className={styles.channelCopy}>
          <span className={styles.channelTitle}>{planDisplayName(planName)} · Shared Credits</span>
          {loading ? (
            <span className={styles.channelDescription} role="status">Loading shared credit balance…</span>
          ) : error ? (
            <span className={styles.channelError} role="status">{error}</span>
          ) : (
            <>
              <span className={styles.channelDescription}>
                Total {balance.total} · Used {balance.used} · Remaining {balance.remaining}
              </span>
              {creditLevel === 'low' && (
                <span className={styles.channelWarning} role="status">Credits running low</span>
              )}
              {creditLevel === 'depleted' && (
                <span className={styles.channelDepletedMessage} role="status">No credits remaining</span>
              )}
              {creditLevel === 'depleted' && eventId && (
                <CommunicationCreditPackOptions
                  eventId={eventId}
                  canPurchase={canPurchaseCredits}
                  compact
                  className={styles.channelPackOptions}
                />
              )}
              {purchasedCredits > 0 && (
                <span className={styles.channelTopup}>Includes +{purchasedCredits} purchased credits</span>
              )}
            </>
          )}
        </span>
      </aside>
    );
  }

  return (
    <aside className={cn(styles.card, className)} aria-label={ariaLabel} aria-live="polite">
      <div className={styles.headingRow}>
        <span className={styles.icon} aria-hidden="true"><MessageSquareText size={18} strokeWidth={1.8} /></span>
        <span className={styles.heading}>Email &amp; SMS Credits</span>
        <span className={styles.plan}>{planDisplayName(planName)}</span>
      </div>

      {loading ? (
        <div className={styles.status} role="status">Loading shared credit balance…</div>
      ) : error ? (
        <div className={styles.error} role="status">{error}</div>
      ) : (
        <>
          <div className={styles.balanceLine}>
            <strong>{balance.remaining}</strong>
            <span>remaining out of {balance.total}</span>
          </div>
          <div className={styles.metrics}>
            <span><small>Total</small><strong>{balance.total}</strong></span>
            <span><small>Used</small><strong>{balance.used}</strong></span>
            <span><small>Remaining</small><strong>{balance.remaining}</strong></span>
          </div>
          <div className={styles.note}>
            One shared balance for Email and SMS.
            {purchasedCredits > 0 && <span> Includes +{purchasedCredits} purchased credits.</span>}
          </div>
          {getCommunicationCreditLevel(balance) === 'depleted' && eventId && (
            <CommunicationCreditPackOptions eventId={eventId} canPurchase={canPurchaseCredits} />
          )}
        </>
      )}
    </aside>
  );
};

interface ConnectedProps {
  eventId: string | null | undefined;
  className?: string;
  ariaLabel?: string;
}

export const CommunicationCreditSummary: React.FC<ConnectedProps> = ({ eventId, className, ariaLabel }) => {
  const { credits, loading, error } = useSmsCredits(eventId);
  const { plan, hasPlatformOwnerAccess, loading: planLoading } = useUserPlan();
  const planName = hasPlatformOwnerAccess ? 'Ultimate' : plan?.plan_name;

  if (!eventId) return null;

  return (
    <CommunicationCreditSummaryCard
      planName={planName}
      planIncludedCredits={hasPlatformOwnerAccess ? 450 : getPlanCommunicationCredits(planName)}
      credits={credits}
      loading={loading || planLoading}
      error={error}
      className={className}
      ariaLabel={ariaLabel}
      eventId={eventId}
      canPurchaseCredits={!hasPlatformOwnerAccess && /^(essential|premium|ultimate|unlimited)$/i.test(planName || '')}
    />
  );
};

export default CommunicationCreditSummary;
