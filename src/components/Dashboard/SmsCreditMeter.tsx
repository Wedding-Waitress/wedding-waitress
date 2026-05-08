import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { MessageSquare, AlertTriangle, Loader2 } from 'lucide-react';
import { useSmsCredits } from '@/hooks/useSmsCredits';
import { useSmsTopup } from '@/hooks/useSmsTopup';
import { SMS_TOPUP } from '@/lib/stripePrices';
import { usePaymentProcessing } from '@/contexts/PaymentProcessingContext';

interface Props {
  eventId: string | null | undefined;
  compact?: boolean;
}

/**
 * SmsCreditMeter — shows remaining Smart RSVP & Messaging SMS credits with
 * low-balance warnings, hard-lock empty state, and a top-up CTA.
 */
export const SmsCreditMeter = ({ eventId, compact }: Props) => {
  const { credits, loading, isLow, isEmpty, isUnactivated } = useSmsCredits(eventId);
  const { startTopup, loading: topupLoading } = useSmsTopup();
  const { processing } = usePaymentProcessing();
  const disabled = topupLoading || processing;

  if (!eventId) return null;

  const percentUsed = credits.total > 0 ? Math.min(100, Math.round((credits.used / credits.total) * 100)) : 0;

  if (isUnactivated) {
    return (
      <Card className="p-4 border-dashed">
        <div className="flex items-center gap-3">
          <MessageSquare className="h-5 w-5 text-muted-foreground" />
          <div className="flex-1 text-sm text-muted-foreground">
            Smart RSVP &amp; Messaging is not active for this event yet.
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`${compact ? 'p-3' : 'p-4'} space-y-3`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <MessageSquare className={`${isEmpty ? 'text-destructive' : isLow ? 'text-amber-600' : 'text-primary'} h-5 w-5`} />
          <div>
            <div className="text-sm font-medium">Smart RSVP &amp; Messaging — SMS credits</div>
            <div className="text-xs text-muted-foreground">
              {loading ? 'Loading…' : `${credits.remaining} of ${credits.total} remaining`}
            </div>
          </div>
        </div>
        <Button
          size="sm"
          onClick={() => startTopup(eventId)}
          disabled={disabled}
          aria-busy={disabled}
          className={`lv-premium-shade ${disabled ? 'pointer-events-none opacity-80' : ''}`}
        >
          {disabled ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Starting checkout…
            </span>
          ) : (
            `Top up +${SMS_TOPUP.credits}`
          )}
        </Button>
      </div>

      <Progress value={percentUsed} className="h-2" />

      {isEmpty && (
        <div className="flex items-start gap-2 text-xs text-destructive">
          <AlertTriangle className="h-4 w-4 mt-0.5" />
          <span>You&apos;ve used all your SMS credits. Top up to keep sending invites and reminders.</span>
        </div>
      )}
      {isLow && !isEmpty && (
        <div className="flex items-start gap-2 text-xs text-amber-700">
          <AlertTriangle className="h-4 w-4 mt-0.5" />
          <span>Low balance — only {credits.remaining} credits left.</span>
        </div>
      )}
    </Card>
  );
};
