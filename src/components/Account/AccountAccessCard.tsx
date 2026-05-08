import React, { useEffect, useState } from 'react';
import { LucideIcon, Crown, UserCog, UserPlus } from 'lucide-react';
import { SectionCard } from './SectionCard';
import { Button } from '@/components/ui/button';
import { useUserPlan } from '@/hooks/useUserPlan';
import { useAccountRole } from '@/hooks/useAccountRole';
import { useEventLimits } from '@/hooks/useEventLimits';
import { useAccountSeats } from '@/hooks/useAccountSeats';
import { supabase } from '@/integrations/supabase/client';
import { ComingSoonSheet } from './ComingSoonSheet';

interface Props {
  icon: LucideIcon;
}

export const AccountAccessCard: React.FC<Props> = ({ icon }) => {
  const { plan } = useUserPlan();
  const { isMaster } = useAccountRole();
  const { includedEvents, additionalPurchased, totalAllowed, currentEvents } = useEventLimits();
  const { usedSeats, maxSeats } = useAccountSeats();
  const [email, setEmail] = useState<string>('—');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setEmail(user?.email ?? '—');
    })();
  }, []);

  const planName = plan?.plan_name || 'Free';
  const isVendorPro = /vendor/i.test(planName);

  return (
    <>
      <SectionCard icon={icon} title="Account Access & Team" description="Your plan, holders, and team">
        {/* Holder row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 mb-4 border-b border-border/50">
          <div className="min-w-0">
            <div className="text-base font-semibold text-foreground truncate">{email}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Account holder</div>
          </div>
          {isMaster ? (
            <span className="inline-flex items-center gap-1.5 self-start sm:self-auto px-3 py-1.5 rounded-full text-xs font-semibold text-white bg-gradient-to-r from-[#C9A87A] via-[#B8946A] to-[#967A59] shadow-[0_2px_8px_-2px_rgba(150,122,89,0.45)]">
              <Crown className="w-3.5 h-3.5" />
              Master Account Holder
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 self-start sm:self-auto px-3 py-1.5 rounded-full text-xs font-semibold text-[#7d6649] bg-[#F5EFE4] border border-[#E8E1D6]">
              Standard User
            </span>
          )}
        </div>

        {/* Stat grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Stat label="Current plan" value={planName} sub={isVendorPro ? 'Built for venues & planners' : undefined} />
          <Stat label="Users" value={`${usedSeats} / ${maxSeats}`} sub="People with access" />
          <Stat label="Events used" value={`${currentEvents} / ${includedEvents}`} sub="Included in your plan" />
          <Stat label="Additional events" value={`${additionalPurchased}`} sub="Purchased separately" />
          <Stat label="Total available events" value={`${totalAllowed}`} sub="Included + additional" className="sm:col-span-2" />
        </div>

        {/* Master actions */}
        {isMaster && (
          <div className="mt-5 flex flex-col sm:flex-row gap-2.5">
            <Button
              variant="outline"
              onClick={() => setOpen(true)}
              className="lv-premium-shade w-full sm:w-auto h-11 rounded-full border-[#967A59]/30 text-[#7d6649] hover:bg-[#F5EFE4] hover:text-[#7d6649]"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Invite User
            </Button>
            <Button
              variant="outline"
              onClick={() => setOpen(true)}
              className="lv-premium-shade w-full sm:w-auto h-11 rounded-full border-[#967A59]/30 text-[#7d6649] hover:bg-[#F5EFE4] hover:text-[#7d6649]"
            >
              <UserCog className="w-4 h-4 mr-2" />
              Manage Users
            </Button>
          </div>
        )}
      </SectionCard>
      <ComingSoonSheet open={open} onOpenChange={setOpen} title="User Management — Coming Soon" />
    </>
  );
};

const Stat: React.FC<{ label: string; value: string; sub?: string; className?: string }> = ({
  label, value, sub, className,
}) => (
  <div
    className={
      'rounded-xl bg-gradient-to-b from-[#FBF7F0] to-white border border-[#E8E1D6]/70 p-3.5 ' +
      (className ?? '')
    }
  >
    <div className="text-[11px] uppercase tracking-wide font-medium text-muted-foreground">{label}</div>
    <div className="mt-1 text-base sm:text-lg font-semibold text-[#1D1D1F] break-words">{value}</div>
    {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
  </div>
);
