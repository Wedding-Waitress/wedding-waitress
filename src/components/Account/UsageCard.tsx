// 🔒 PRODUCTION-LOCKED — Usage Card (2026-04-25) — Phase 2 enriched 2026-05-08
import React, { useEffect, useState } from 'react';
import { LucideIcon } from 'lucide-react';
import { SectionCard } from './SectionCard';
import { Progress } from '@/components/ui/progress';
import { useUserPlan } from '@/hooks/useUserPlan';
import { useEventLimits } from '@/hooks/useEventLimits';
import { useAccountSeats } from '@/hooks/useAccountSeats';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  icon: LucideIcon;
}

export const UsageCard: React.FC<Props> = ({ icon }) => {
  const { plan } = useUserPlan();
  const { currentEvents, totalAllowed, additionalPurchased } = useEventLimits();
  const { usedSeats, maxSeats } = useAccountSeats();
  const [totalGuests, setTotalGuests] = useState<number>(0);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { count } = await supabase
        .from('guests')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      setTotalGuests(count || 0);
    })();
  }, []);

  const guestLimit = plan?.guest_limit ?? null;
  const guestPct = guestLimit ? Math.min(100, (totalGuests / guestLimit) * 100) : 0;
  const eventsPct = totalAllowed > 0 ? Math.min(100, (currentEvents / totalAllowed) * 100) : 0;
  const seatsPct = maxSeats > 0 ? Math.min(100, (usedSeats / maxSeats) * 100) : 0;

  const eventsLabel = additionalPurchased > 0
    ? `${currentEvents} / ${totalAllowed} (+${additionalPurchased} additional)`
    : `${currentEvents} / ${totalAllowed}`;

  return (
    <SectionCard icon={icon} title="Usage" description="Your account activity">
      <div className="space-y-5">
        <Bar
          label="Total Guests"
          value={`${totalGuests}${guestLimit ? ` / ${guestLimit}` : ' (unlimited)'}`}
          pct={guestLimit ? guestPct : 100}
        />
        <Bar label="Events used" value={eventsLabel} pct={eventsPct} />
        <Bar label="Team seats" value={`${usedSeats} / ${maxSeats}`} pct={seatsPct} />
        <Bar label="Storage Usage" value="Coming soon" pct={0} muted />
      </div>
    </SectionCard>
  );
};

const Bar: React.FC<{ label: string; value: string; pct: number; muted?: boolean }> = ({
  label, value, pct, muted,
}) => {
  const warn = !muted && pct >= 80;
  return (
    <div>
      <div className="flex items-center justify-between mb-2 text-sm">
        <span className="font-medium text-foreground">{label}</span>
        <span className={muted ? 'text-muted-foreground' : 'text-foreground font-medium'}>{value}</span>
      </div>
      <Progress
        value={pct}
        className={
          'h-2 bg-[#E8E1D6]/50 ' +
          (warn
            ? '[&>div]:bg-gradient-to-r [&>div]:from-[#E0B66A] [&>div]:to-[#B0832E]'
            : '[&>div]:bg-gradient-to-r [&>div]:from-[#C9A87A] [&>div]:to-[#967A59]')
        }
      />
    </div>
  );
};
