// 🔒 PRODUCTION-LOCKED — Subscription Card (2026-04-18)
import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SectionCard } from './SectionCard';
import { useUserPlan } from '@/hooks/useUserPlan';

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

  const isExpired = !!isTrialExpired;
  const statusLabel = isExpired ? 'Expired' : plan?.status === 'active' || plan?.status === 'trial' ? 'Active' : (plan?.status || '—');

  return (
    <SectionCard icon={icon} title="Subscription" description="Your current plan">
      <div className="space-y-3 text-sm">
        <div className="flex items-center justify-between gap-3 py-2 border-b border-border/50">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-base font-semibold text-foreground">
              {plan?.plan_name || 'Free'}
            </span>
            <Badge
              className={
                isExpired
                  ? 'bg-red-100 text-red-700 hover:bg-red-100 border-red-200'
                  : 'bg-green-100 text-green-700 hover:bg-green-100 border-green-200'
              }
            >
              {statusLabel}
            </Badge>
          </div>
        </div>
        <Row label="Start date" value="—" />
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
