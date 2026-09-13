// 🔒 PRODUCTION-LOCKED — Subscription Card (2026-04-25) — plan and usage summary
import React, { useEffect, useState } from 'react';
import { LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { SectionCard } from './SectionCard';
import { useUserPlan } from '@/hooks/useUserPlan';
import { useAccountBilling } from '@/hooks/useAccountBilling';
import { useEventLimits } from '@/hooks/useEventLimits';
import { useAccountSeats } from '@/hooks/useAccountSeats';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { ExtendPlanModal } from '@/components/Dashboard/ExtendPlanModal';
import { useAccountRole } from '@/hooks/useAccountRole';
import controlStyles from './AccountControls.module.css';

interface Props {
  icon: LucideIcon;
}

const formatDate = (iso: string | null) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const SubscriptionCard: React.FC<Props> = ({ icon }) => {
  const { plan, loading, isTrialExpired, hasPlatformOwnerAccess } = useUserPlan();
  const { data: billing } = useAccountBilling();
  const {
    loading: usageLoading,
    eventsError,
    additionalEventsError,
    guestsError,
    includedEvents,
    additionalPurchased,
    remaining,
    currentEvents,
    totalGuests,
  } = useEventLimits();
  const { usedSeats, maxSeats } = useAccountSeats();
  const { toast } = useToast();
  const { isMaster } = useAccountRole();
  const [startDate, setStartDate] = useState<string | null>(null);
  const [extensionOpen, setExtensionOpen] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: sub } = await supabase.from('user_subscriptions').select('created_at').eq('user_id', user.id).limit(1).maybeSingle();
      if (!active) return;
      setStartDate(sub?.created_at ?? user.created_at ?? null);
    })();
    return () => { active = false; };
  }, []);

  // Tick every minute so the countdown stays fresh without re-fetching.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const planName = plan?.plan_name || 'Free';
  const isFreeOrStarter = !plan || /^(free|starter)$/i.test(planName);
  // Prepaid monthly extensions are excluded from this release. Existing
  // expiry/renewal gates provide the approved three-package renewal flow.
  const canExtend = false;

  // Compute days left for free/starter trial.
  const trialExpiry = plan?.expires_at
    ? new Date(plan.expires_at)
    : startDate
      ? new Date(new Date(startDate).getTime() + 7 * 24 * 60 * 60 * 1000)
      : null;
  const msLeft = trialExpiry ? trialExpiry.getTime() - Date.now() : null;
  const daysLeft = msLeft != null ? Math.max(0, Math.ceil(msLeft / (24 * 60 * 60 * 1000))) : null;

  const isExpired = !loading && !hasPlatformOwnerAccess && (!!isTrialExpired || (isFreeOrStarter && daysLeft === 0));
  const status = plan?.status || 'active';
  let badgeClass = 'bg-green-100 text-green-700 hover:bg-green-100 border-green-200';
  let statusLabel: string = 'Active';
  let displayPlanName = planName;

  if (hasPlatformOwnerAccess) {
    displayPlanName = 'Platform Owner Access';
    statusLabel = 'Full Access';
  } else if (isFreeOrStarter) {
    if (isExpired) {
      badgeClass = 'bg-red-100 text-red-700 hover:bg-red-100 border-red-200';
      statusLabel = 'Expired';
      displayPlanName = '7-Day Free Trial (Expired)';
    } else if (daysLeft != null) {
      displayPlanName = `7-Day Free Trial (${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left)`;
      statusLabel = 'Active';
    } else {
      displayPlanName = '7-Day Free Trial';
    }
  } else if (isExpired || status === 'expired') {
    badgeClass = 'bg-red-100 text-red-700 hover:bg-red-100 border-red-200';
    statusLabel = 'Expired';
  } else if (status === 'trial') {
    badgeClass = 'bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200';
    statusLabel = 'Trial';
  } else if (status === 'cancelled' || status === 'canceled') {
    badgeClass = 'bg-gray-100 text-gray-700 hover:bg-gray-100 border-gray-200';
    statusLabel = 'Cancelled';
  }

  return (
    <SectionCard icon={icon} title="Current Plan" description="Plan status, allowances and usage">
      <div className="space-y-3 text-sm">
        <div className="flex items-center justify-between gap-3 py-2 border-b border-border/50">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-base font-semibold text-foreground break-words">
              {displayPlanName}
            </span>
            <Badge className={badgeClass}>{statusLabel}</Badge>
          </div>
        </div>
        <Row label="Start date" value={formatDate(startDate)} />
        <Row label="Expiry date" value={formatDate(plan?.expires_at ?? null)} />
        {canExtend && (
          <div className="rounded-xl border border-amber-300/60 bg-amber-50/70 p-3 text-sm text-amber-950">
            <p>Extend access for one month or any number of whole months at A$20 per month, paid upfront.</p>
            {isExpired && <p className="mt-1">Your planning and download access is paused. Your saved account remains recoverable for six months after expiry.</p>}
            <Button className={`${controlStyles.primaryButton} mt-3`} size="sm" onClick={() => setExtensionOpen(true)}>Extend Access</Button>
          </div>
        )}
        <div className="pt-3 mt-1 border-t border-border/50">
          <div className="text-[11px] uppercase tracking-wide font-medium text-muted-foreground mb-1">
            Plan inclusions
          </div>
          <Row label="Included events" value={`${includedEvents}`} />
          <Row label="Events used" value={usageLoading ? 'Loading…' : eventsError ? 'Unavailable' : `${currentEvents}`} />
          <Row label="Additional events purchased" value={usageLoading ? 'Loading…' : additionalEventsError ? 'Unavailable' : `${additionalPurchased}`} />
          <Row label="Remaining events" value={usageLoading ? 'Loading…' : eventsError || additionalEventsError ? 'Unavailable' : `${remaining}`} />
          <Row label="Guest allowance" value={usageLoading ? 'Loading…' : guestsError ? 'Unavailable' : plan?.guest_limit ? `${totalGuests} / ${plan.guest_limit}` : `${totalGuests} used · Unlimited`} />
          <Row label="User seats" value={`${usedSeats} / ${maxSeats}`} />
        </div>
      </div>
      {canExtend && plan?.expires_at && (
        <ExtendPlanModal isOpen={extensionOpen} onClose={() => setExtensionOpen(false)} planName={planName} expiresAt={plan.expires_at} />
      )}
    </SectionCard>
  );
};

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-2 border-b border-border/50 last:border-0">
    <span className="text-muted-foreground font-medium">{label}</span>
    <span className="text-foreground font-medium">{value}</span>
  </div>
);
