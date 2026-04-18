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

  const isExpired = !!isTrialExpired;
  const status = plan?.status || 'active';
  let badgeClass = 'bg-green-100 text-green-700 hover:bg-green-100 border-green-200';
  let statusLabel: string = 'Active';
  if (isExpired || status === 'expired') {
    badgeClass = 'bg-red-100 text-red-700 hover:bg-red-100 border-red-200';
    statusLabel = 'Expired';
  } else if (status === 'trial') {
    badgeClass = 'bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200';
    statusLabel = 'Trial';
  } else if (status === 'cancelled' || status === 'canceled') {
    badgeClass = 'bg-gray-100 text-gray-700 hover:bg-gray-100 border-gray-200';
    statusLabel = 'Cancelled';
  } else if (status === 'active') {
    statusLabel = 'Active';
  }

  return (
    <SectionCard icon={icon} title="Subscription" description="Your current plan">
      <div className="space-y-3 text-sm">
        <div className="flex items-center justify-between gap-3 py-2 border-b border-border/50">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-base font-semibold text-foreground">
              {plan?.plan_name || 'Free'}
            </span>
            <Badge className={badgeClass}>{statusLabel}</Badge>
          </div>
        </div>
        <Row label="Start date" value={formatDate(startDate)} />
        <Row label="Expiry date" value={formatDate(plan?.expires_at ?? null)} />
      </div>
      <div className="mt-6">
        <Button
          onClick={() => window.location.assign('/dashboard?tab=my-events')}
          className="bg-[#967A59] hover:bg-[#7d6649] text-white rounded-full"
          size="sm"
        >
          Upgrade Plan
        </Button>
      </div>
    </SectionCard>
  );
};

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-2 border-b border-border/50 last:border-0">
    <span className="text-muted-foreground font-medium">{label}</span>
    <span className="text-foreground font-medium">{value}</span>
  </div>
);
