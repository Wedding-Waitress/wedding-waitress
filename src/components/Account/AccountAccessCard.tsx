import React, { useEffect, useState } from 'react';
import { LucideIcon, Crown, UserCog, UserPlus } from 'lucide-react';
import { SectionCard } from './SectionCard';
import { Button } from '@/components/ui/button';
import { useAccountRole } from '@/hooks/useAccountRole';
import { useAccountSeats } from '@/hooks/useAccountSeats';
import { supabase } from '@/integrations/supabase/client';
import { ComingSoonSheet } from './ComingSoonSheet';
import controlStyles from './AccountControls.module.css';

interface Props {
  icon: LucideIcon;
}

export const AccountAccessCard: React.FC<Props> = ({ icon }) => {
  const { isMaster } = useAccountRole();
  const { usedSeats, maxSeats, remainingSeats } = useAccountSeats();
  const [email, setEmail] = useState<string>('—');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setEmail(user?.email ?? '—');
    })();
  }, []);

  return (
    <>
      <SectionCard icon={icon} title="Team & Access" description="Account holders, team members and permissions">
        {/* Holder row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 mb-4 border-b border-border/50">
          <div className="min-w-0">
            <div className="text-base font-semibold text-foreground truncate">{email}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Account holder</div>
          </div>
          {isMaster ? (
            <span className={`${controlStyles.statusBadge} self-start sm:self-auto`}>
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
          <Stat label="Seats used" value={`${usedSeats} / ${maxSeats}`} sub="People with account access" />
          <Stat label="Seats available" value={`${remainingSeats}`} sub="Available team invitations" />
        </div>

        {/* Master actions */}
        {isMaster && (
          <div className="mt-5 flex flex-col sm:flex-row gap-2.5">
            <Button
              variant="outline"
              onClick={() => setOpen(true)}
              className={`${controlStyles.primaryButton} w-full sm:w-auto`}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Invite User
            </Button>
            <Button
              variant="outline"
              onClick={() => setOpen(true)}
              className={`${controlStyles.secondaryButton} w-full sm:w-auto`}
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
