import React from 'react';
import { CalendarCheck, AlertTriangle } from 'lucide-react';
import { useEventLimits } from '@/hooks/useEventLimits';

export const EventUsagePill: React.FC = () => {
  const { loading, currentEvents, totalAllowed, additionalPurchased, remaining } = useEventLimits();
  if (loading) return null;

  const nearLimit = remaining <= 1 && remaining >= 0;

  return (
    <div
      className={
        'inline-flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 px-3.5 py-2 rounded-full border text-sm transition-colors ' +
        (nearLimit
          ? 'bg-gradient-to-r from-[#FBF1DE] to-[#F5E6C8] border-[#D9B97A]/60 text-[#7d5a1c]'
          : 'bg-[#FBF7F0] border-[#E8E1D6] text-[#7d6649]')
      }
    >
      <span className="inline-flex items-center gap-1.5 font-medium">
        {nearLimit ? <AlertTriangle className="w-3.5 h-3.5" /> : <CalendarCheck className="w-3.5 h-3.5" />}
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
