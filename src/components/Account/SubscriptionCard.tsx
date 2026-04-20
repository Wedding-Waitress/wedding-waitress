// 🔒 PRODUCTION-LOCKED — Subscription Card (2026-04-18) — Stripe upgrade flow
import React, { useEffect, useState } from 'react';
import { Loader2, LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SectionCard } from './SectionCard';
import { useUserPlan } from '@/hooks/useUserPlan';
import { useAccountBilling } from '@/hooks/useAccountBilling';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { PLAN_PRICES } from '@/lib/stripePrices';
import { UpgradePlanModal } from './UpgradePlanModal';

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
  const { plan, isTrialExpired } = useUserPlan();
  const { data: billing } = useAccountBilling();
  const { toast } = useToast();
  const [startDate, setStartDate] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: sub } = await supabase
        .from('user_subscriptions')
        .select('created_at')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();
      if (!active) return;
      setStartDate((sub as any)?.created_at ?? user.created_at ?? null);
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

  // Compute days left for free/starter trial.
  const trialExpiry = plan?.expires_at
    ? new Date(plan.expires_at)
    : startDate
      ? new Date(new Date(startDate).getTime() + 7 * 24 * 60 * 60 * 1000)
      : null;
  const msLeft = trialExpiry ? trialExpiry.getTime() - Date.now() : null;
  const daysLeft = msLeft != null ? Math.max(0, Math.ceil(msLeft / (24 * 60 * 60 * 1000))) : null;

  const isExpired = !!isTrialExpired || (isFreeOrStarter && daysLeft === 0);
  const status = plan?.status || 'active';
  let badgeClass = 'bg-green-100 text-green-700 hover:bg-green-100 border-green-200';
  let statusLabel: string = 'Active';
  let displayPlanName = planName;

  if (isFreeOrStarter) {
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

  const handleUpgrade = () => {
    // Existing paying customers go to Stripe portal directly to manage billing.
    if (billing?.portalUrl) {
      window.open(billing.portalUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    // New / trial users see the plan selection modal first.
    setUpgradeOpen(true);
  };

  return (
    <SectionCard icon={icon} title="Subscription" description="Your current plan">
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
      </div>
      <div className="mt-6">
        <Button
          onClick={handleUpgrade}
          disabled={busy}
          className="bg-[#967A59] hover:bg-[#7d6649] text-white rounded-full"
          size="sm"
        >
          {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {billing?.portalUrl ? 'Manage Billing' : 'Upgrade Plan'}
        </Button>
      </div>
      <UpgradePlanModal open={upgradeOpen} onOpenChange={setUpgradeOpen} />
    </SectionCard>
  );
};

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-2 border-b border-border/50 last:border-0">
    <span className="text-muted-foreground font-medium">{label}</span>
    <span className="text-foreground font-medium">{value}</span>
  </div>
);
