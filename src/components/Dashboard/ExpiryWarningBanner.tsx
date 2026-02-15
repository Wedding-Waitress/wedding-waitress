import React, { useState, useMemo } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ExtendPlanModal } from './ExtendPlanModal';
import { useUserPlan } from '@/hooks/useUserPlan';

const ELIGIBLE_PLANS = ['Essential', 'Premium', 'Unlimited'];

export const ExpiryWarningBanner: React.FC = () => {
  const { plan } = useUserPlan();
  const [dismissed, setDismissed] = useState(false);
  const [showExtendModal, setShowExtendModal] = useState(false);

  const warningInfo = useMemo(() => {
    if (!plan?.expires_at || !plan?.plan_name) return null;
    if (!ELIGIBLE_PLANS.includes(plan.plan_name)) return null;

    const now = new Date();
    const expiresAt = new Date(plan.expires_at);
    const diffMs = expiresAt.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));

    if (diffDays > 30 || diffDays < 0) return null;

    if (diffHours <= 24) {
      return {
        level: 'critical' as const,
        message: `Your account expires in less than 24 hours! Extend now to keep your data.`,
        bgClass: 'bg-red-900 text-white',
        animate: true,
      };
    }
    if (diffDays <= 7) {
      return {
        level: 'urgent' as const,
        message: `Your account expires in ${diffDays} day${diffDays !== 1 ? 's' : ''}. Extend your plan to keep your data.`,
        bgClass: 'bg-red-600 text-white',
        animate: false,
      };
    }
    if (diffDays <= 14) {
      return {
        level: 'warning' as const,
        message: `Your account expires in ${diffDays} days. Extend your plan to keep your data.`,
        bgClass: 'bg-orange-500 text-white',
        animate: false,
      };
    }
    // 15-30 days
    return {
      level: 'notice' as const,
      message: `Your account expires in ${diffDays} days. Extend your plan to keep your data.`,
      bgClass: 'bg-amber-500 text-white',
      animate: false,
    };
  }, [plan]);

  if (!warningInfo || dismissed) return null;

  return (
    <>
      <div
        className={`w-full px-4 py-3 flex items-center justify-between gap-3 ${warningInfo.bgClass} ${warningInfo.animate ? 'animate-pulse' : ''}`}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium truncate">{warningInfo.message}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            size="sm"
            variant="secondary"
            className="rounded-full text-xs font-semibold"
            onClick={() => setShowExtendModal(true)}
          >
            Extend Plan
          </Button>
          <button
            onClick={() => setDismissed(true)}
            className="p-1 rounded-full hover:bg-white/20 transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <ExtendPlanModal
        isOpen={showExtendModal}
        onClose={() => setShowExtendModal(false)}
        planName={plan?.plan_name || ''}
        expiresAt={plan?.expires_at || ''}
      />
    </>
  );
};
