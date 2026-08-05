/**
 * SmartSmsCreditStatus
 *
 * Premium credit-intelligence surface for the Smart RSVP & Messaging
 * ecosystem. Reusable across Guest List top controls (`variant="full"`)
 * and the Smart RSVP Analytics panel header (`variant="compact"`).
 *
 * Pulls from `useSmsCredits` (already realtime-synced via the
 * `sms_credits` postgres channel), so all surfaces — card, KPI chips,
 * low-credit pills, send-button locks — update atomically without
 * polling.
 */
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageSquareText, AlertTriangle, Loader2, Zap, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSmsCredits } from '@/hooks/useSmsCredits';
import { useSmsTopup } from '@/hooks/useSmsTopup';
import { usePaymentProcessing } from '@/contexts/PaymentProcessingContext';
import { SMS_TOPUP } from '@/lib/stripePrices';

export type CreditHealthState =
  | 'healthy'
  | 'low'
  | 'critical'
  | 'empty'
  | 'unactivated';

export interface CreditHealth {
  state: CreditHealthState;
  remaining: number;
  total: number;
  message: string;
  toneClasses: string;
  iconColor: string;
}

/**
 * Single source of truth for credit thresholds + tone.
 * Healthy ≥100, Low 25–99, Critical 1–24, Empty 0 (with total>0),
 * Unactivated total=0.
 */
export const getCreditHealth = (
  remaining: number,
  total: number,
): CreditHealth => {
  if (total <= 0) {
    return {
      state: 'unactivated',
      remaining,
      total,
      message: 'Smart RSVP & Messaging is not active for this event yet.',
      toneClasses: 'border-border bg-muted/30',
      iconColor: 'text-muted-foreground',
    };
  }
  if (remaining <= 0) {
    return {
      state: 'empty',
      remaining,
      total,
      message: "You've used all included SMS credits.",
      toneClasses: 'border-red-200 bg-red-50/60',
      iconColor: 'text-red-600',
    };
  }
  if (remaining <= 24) {
    return {
      state: 'critical',
      remaining,
      total,
      message: `Only ${remaining} SMS credit${remaining === 1 ? '' : 's'} remaining.`,
      toneClasses: 'border-red-200 bg-red-50/40',
      iconColor: 'text-red-600',
    };
  }
  if (remaining <= 99) {
    return {
      state: 'low',
      remaining,
      total,
      message: "You're running low on SMS credits.",
      toneClasses: 'border-amber-200 bg-amber-50/50',
      iconColor: 'text-amber-600',
    };
  }
  return {
    state: 'healthy',
    remaining,
    total,
    message: 'Your Smart RSVP messaging system is running smoothly.',
    toneClasses: 'border-emerald-200 bg-emerald-50/40',
    iconColor: 'text-emerald-600',
  };
};

/**
 * Lightweight projection helper. Defaults to 1 credit ≈ 1 invitation;
 * if `recipientCount` is supplied, also computes how many full campaigns
 * fit within the remaining balance.
 */
export const projectSends = (
  remaining: number,
  recipientCount?: number,
): { invites: string; campaigns?: string } => {
  const invites = `Approx. ${remaining} more SMS invitation${remaining === 1 ? '' : 's'}`;
  if (!recipientCount || recipientCount <= 0) return { invites };
  const campaigns = Math.floor(remaining / Math.max(1, recipientCount));
  return {
    invites,
    campaigns: `Enough for approximately ${campaigns} more RSVP campaign${campaigns === 1 ? '' : 's'}.`,
  };
};

/**
 * Per-credit AUD value, derived dynamically from the centralized
 * `SMS_TOPUP` constants. Adapts automatically if pricing or included
 * credits change.
 */
export const getCreditUnitValueAud = (): number => {
  if (!SMS_TOPUP.credits || SMS_TOPUP.credits <= 0) return 0;
  return SMS_TOPUP.price_aud / SMS_TOPUP.credits;
};

const audFormatter = new Intl.NumberFormat('en-AU', {
  style: 'currency',
  currency: 'AUD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** "Approx. $9.10 AUD value remaining" — empty string when unactivated. */
export const formatRemainingValue = (remaining: number, total: number): string => {
  if (total <= 0 || remaining <= 0) return '';
  const value = remaining * getCreditUnitValueAud();
  return `Approx. ${audFormatter.format(value)} AUD value remaining`;
};

const stateBadgeLabel: Record<CreditHealthState, string> = {
  healthy: 'Healthy',
  low: 'Low',
  critical: 'Critical',
  empty: 'Empty',
  unactivated: 'Inactive',
};

const stateBadgeClasses: Record<CreditHealthState, string> = {
  healthy: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  low: 'bg-amber-100 text-amber-700 border-amber-200',
  critical: 'bg-red-100 text-red-700 border-red-200',
  empty: 'bg-red-600 text-white border-red-700',
  unactivated: 'bg-muted text-muted-foreground border-border',
};

interface Props {
  eventId: string | null | undefined;
  /** `full` for Guest List controls; `compact` for analytics header. */
  variant?: 'full' | 'compact';
  /** Optional recipient count for campaign projections. */
  recipientCount?: number;
  className?: string;
}

export const SmartSmsCreditStatus: React.FC<Props> = ({
  eventId,
  variant = 'full',
  recipientCount,
  className,
}) => {
  const { credits, loading } = useSmsCredits(eventId);
  const { startTopup, loading: topupLoading } = useSmsTopup();
  const { processing } = usePaymentProcessing();

  if (!eventId) return null;

  const health = getCreditHealth(credits.remaining, credits.total);
  const ctaDisabled = topupLoading || processing;
  const projection = projectSends(credits.remaining, recipientCount);
  const valueLine = formatRemainingValue(credits.remaining, credits.total);

  // Compact variant — analytics header strip
  if (variant === 'compact') {
    if (health.state === 'unactivated') return null;
    return (
      <Card className={cn('p-3 flex items-center gap-3 rounded-2xl', health.toneClasses, className)}>
        <MessageSquareText size={20} strokeWidth={1.8} className={cn('shrink-0', health.iconColor)} aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-foreground">
            {loading ? 'Loading…' : `${credits.remaining} SMS Credits Remaining`}
          </div>
          <div className="text-[11px] text-muted-foreground truncate">
            {health.state === 'healthy' || health.state === 'low'
              ? projection.invites
              : health.message}
            {valueLine && (
              <span className="text-muted-foreground/80"> · {valueLine}</span>
            )}
          </div>
        </div>
        <Badge variant="outline" className={cn('text-[10px] font-semibold', stateBadgeClasses[health.state])}>
          {stateBadgeLabel[health.state]}
        </Badge>
        <Button
          size="sm"
          onClick={() => startTopup(eventId)}
          disabled={ctaDisabled}
          className={cn(
            'lv-premium-shade rounded-full h-8 px-3 text-xs',
            ctaDisabled && 'pointer-events-none opacity-80',
          )}
        >
          {ctaDisabled ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Top Up'}
        </Button>
      </Card>
    );
  }

  // Full variant — Guest List top controls
  return (
    <Card className={cn('p-4 rounded-2xl shadow-soft', health.toneClasses, className)}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className={cn('p-2 rounded-xl bg-background/70 border border-border/60', health.iconColor)}>
            <MessageSquareText size={20} strokeWidth={1.8} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-base font-semibold text-foreground">
                {loading ? 'Loading credits…' : `${credits.remaining} SMS Credits Remaining`}
              </span>
              <Badge variant="outline" className={cn('text-[10px] font-semibold', stateBadgeClasses[health.state])}>
                {stateBadgeLabel[health.state]}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {projection.invites}
              {projection.campaigns && (
                <>
                  {' · '}
                  <span>{projection.campaigns}</span>
                </>
              )}
            </div>
            {valueLine && (
              <div className="text-[11px] text-muted-foreground/80 mt-0.5">
                {valueLine}
              </div>
            )}
            <div
              className={cn(
                'mt-2 text-xs flex items-start gap-1.5',
                health.state === 'critical' || health.state === 'empty'
                  ? 'text-red-700'
                  : health.state === 'low'
                  ? 'text-amber-700'
                  : 'text-muted-foreground',
              )}
            >
              {(health.state === 'critical' || health.state === 'empty' || health.state === 'low') && (
                <AlertTriangle className="h-3.5 w-3.5 mt-px shrink-0" />
              )}
              {health.state === 'healthy' && <Zap className="h-3.5 w-3.5 mt-px shrink-0 text-emerald-600" />}
              <span>{health.message}</span>
            </div>
          </div>
        </div>
        <Button
          size="sm"
          onClick={() => startTopup(eventId)}
          disabled={ctaDisabled || health.state === 'unactivated'}
          className={cn(
            'lv-premium-shade rounded-full h-9 px-4 text-xs',
            ctaDisabled && 'pointer-events-none opacity-80',
          )}
        >
          {ctaDisabled ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Starting checkout…
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5">
              <CreditCard size={15} strokeWidth={1.8} className="shrink-0" aria-hidden="true" />
              {`Top Up Credits +${SMS_TOPUP.credits}`}
            </span>
          )}
        </Button>
      </div>
    </Card>
  );
};

export default SmartSmsCreditStatus;
