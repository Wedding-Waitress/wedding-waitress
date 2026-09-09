import React, { useState } from 'react';
import { LucideIcon, Crown, UserCog, UserPlus } from 'lucide-react';
import { SectionCard } from './SectionCard';
import { Button } from '@/components/ui/button';
import { useAccountRole } from '@/hooks/useAccountRole';
import { TeamAccessDialog } from './TeamAccessDialog';
import { useTeamAccess } from '@/hooks/useTeamAccess';
import { useProfile } from '@/hooks/useProfile';
import controlStyles from './AccountControls.module.css';
import { TEAM_ACCESS_ENABLED } from '@/lib/teamAccessAvailability';
import teamStyles from './TeamAccessDialog.module.css';

interface Props {
  icon: LucideIcon;
}

export const AccountAccessCard: React.FC<Props> = ({ icon }) => {
  const { isMaster } = useAccountRole();
  const team = useTeamAccess(TEAM_ACCESS_ENABLED);
  const { profile } = useProfile();
  const [dialog, setDialog] = useState<'invite' | 'manage' | null>(null);
  const visibleMembers = TEAM_ACCESS_ENABLED ? team.members : profile ? [{
    id: profile.id,
    member_user_id: profile.id,
    member_email: profile.email || '—',
    first_name: profile.first_name,
    last_name: profile.last_name,
    mobile: profile.mobile,
    // Before the reviewed Team backend is enabled this card represents the
    // signed-in user's own account, so the existing holder must not disappear
    // or be mislabeled merely because membership RPCs are deliberately gated.
    role: 'master' as const,
    invited_at: '',
    accepted_at: '',
  }] : [];

  return (
    <>
      <SectionCard icon={icon} title="Team & Access" description="Account holders, team members and permissions">
        <div className={teamStyles.peopleTable} role="table" aria-label="People with account access">
          <div data-team-roster-header className={teamStyles.tableHeader} role="row"><span data-team-roster-label role="columnheader">Full Name</span><span data-team-roster-label role="columnheader">Email</span><span data-team-roster-label role="columnheader">Phone Number</span><span data-team-roster-label role="columnheader">Account Role</span></div>
          <div className={teamStyles.list}>{visibleMembers.map((member) => <div className={teamStyles.personRow} role="row" key={member.id}>
            <div role="cell" data-label="Full Name"><strong>{[member.first_name,member.last_name].filter(Boolean).join(' ') || 'Name not provided'}</strong></div>
            <div role="cell" data-label="Email"><span>{member.member_email}</span></div>
            <div role="cell" data-label="Phone Number"><span>{member.mobile || '—'}</span></div>
            <div className={teamStyles.roleCell} role="cell" data-label="Account Role">{member.role === 'master' ? <span data-master-account-badge className={teamStyles.badge}><Crown /> Master Account Holder</span> : <span className={teamStyles.memberBadge}>Team Member</span>}</div>
          </div>)}{visibleMembers.length === 0 && <div className={teamStyles.emptyRoster}>Loading account holder…</div>}</div>
        </div>

        {/* Stat grid */}
        {TEAM_ACCESS_ENABLED && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Stat label="Seats used" value={`${team.seats.used} / ${team.seats.maximum}`} sub="People with account access" />
          <Stat label="Seats available" value={`${team.seats.remaining}`} sub="Available team invitations" />
        </div>
        )}

        {/* Master actions */}
        {TEAM_ACCESS_ENABLED && isMaster && (
          <div className="mt-5 flex flex-col sm:flex-row gap-2.5">
            <Button
              variant="outline"
              onClick={() => setDialog('invite')}
              className={`${controlStyles.primaryButton} w-full sm:w-auto`}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Invite User
            </Button>
            <Button
              variant="outline"
              onClick={() => setDialog('manage')}
              className={`${controlStyles.secondaryButton} w-full sm:w-auto`}
            >
              <UserCog className="w-4 h-4 mr-2" />
              Manage Users
            </Button>
          </div>
        )}
      </SectionCard>
      {TEAM_ACCESS_ENABLED && <TeamAccessDialog open={dialog !== null} onOpenChange={(open) => { if (!open) setDialog(null); }} mode={dialog ?? 'manage'} onChanged={team.refresh} />}
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
