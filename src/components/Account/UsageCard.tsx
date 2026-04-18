// 🔒 PRODUCTION-LOCKED — Usage Card (2026-04-18)
import React, { useEffect, useState } from 'react';
import { LucideIcon } from 'lucide-react';
import { SectionCard } from './SectionCard';
import { Progress } from '@/components/ui/progress';
import { useUserPlan } from '@/hooks/useUserPlan';
import { useEvents } from '@/hooks/useEvents';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  icon: LucideIcon;
}

export const UsageCard: React.FC<Props> = ({ icon }) => {
  const { plan } = useUserPlan();
  const { events } = useEvents();
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
  const eventsCount = events.length;
  const eventsPct = Math.min(100, (eventsCount / 10) * 100);

  return (
    <SectionCard icon={icon} title="Usage" description="Your account activity">
      <div className="space-y-5">
        <Bar
          label="Total Guests"
          value={`${totalGuests}${guestLimit ? ` / ${guestLimit}` : ' (unlimited)'}`}
          pct={guestLimit ? guestPct : 100}
        />
        <Bar label="Total Events" value={`${eventsCount}`} pct={eventsPct} />
        <Bar label="Storage Usage" value="Coming soon" pct={0} muted />
      </div>
    </SectionCard>
  );
};

const Bar: React.FC<{ label: string; value: string; pct: number; muted?: boolean }> = ({
  label,
  value,
  pct,
  muted,
}) => (
  <div>
    <div className="flex items-center justify-between mb-2 text-sm">
      <span className="font-medium text-foreground">{label}</span>
      <span className={muted ? 'text-muted-foreground' : 'text-foreground font-medium'}>{value}</span>
    </div>
    <Progress
      value={pct}
      className="h-2 [&>div]:bg-[#967A59]"
    />
  </div>
);
