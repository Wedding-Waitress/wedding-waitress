import React from 'react';
import { CalendarRange, AlertTriangle } from 'lucide-react';
import { useEventLimits } from '@/hooks/useEventLimits';

export const EventUsagePill: React.FC = () => {
  const { loading, currentEvents, totalAllowed, additionalPurchased, remaining } = useEventLimits();
  if (loading) return null;

  const nearLimit = remaining <= 1 && remaining >= 0;

  return (
    <div
      className={
        'ww-event-usage-pill inline-flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 px-3.5 py-2 rounded-full border text-sm transition-colors border-[#472c1d] text-[#472c1d] ' +
        (nearLimit
          ? 'bg-gradient-to-r from-[#FBF1DE] to-[#F5E6C8]'
          : 'bg-[#FBF7F0]')

      }
    >
      <span className="inline-flex items-center gap-1.5 font-medium">
        {nearLimit ? <AlertTriangle size={16} strokeWidth={1.8} className="shrink-0" aria-hidden="true" /> : <CalendarRange size={16} strokeWidth={1.8} className="shrink-0" aria-hidden="true" />}
        {currentEvents} of {totalAllowed} events used
      </span>
      {additionalPurchased > 0 && (
        <span className="text-xs text-muted-foreground sm:before:content-['·'] sm:before:mr-3">
          +{additionalPurchased} additional event{additionalPurchased === 1 ? '' : 's'} purchased
        </span>
      )}
    </div>
  );
};
