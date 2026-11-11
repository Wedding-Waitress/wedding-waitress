import React, { useState } from 'react';
import { LucideIcon, Crown, UserCog, UserPlus } from 'lucide-react';
import { SectionCard } from './SectionCard';
import { Button } from '@/components/ui/button';
import { useAccountRole } from '@/hooks/useAccountRole';
import { TeamAccessDialog } from './TeamAccessDialog';
import { useTeamAccess } from '@/hooks/useTeamAccess';
import { useProfile } from '@/hooks/useProfile';
import controlStyles from './AccountControls.module.css';

import teamStyles from './TeamAccessDialog.module.css';

interface Props {
  icon: LucideIcon;
}

export const AccountAccessCard: React.FC<Props> = ({ icon }) => {
  const { isMaster } = useAccountRole();
  const team = useTeamAccess();
  const { profile } = useProfile();
  const [dialog, setDialog] = useState<'invite' | 'manage' | null>(null);
  const ready = team.ready === true && !team.loading && !team.error;
  const hasData = team.hasData ?? team.ready;
  const visibleMembers = hasData ? team.members : profile ? [{
    id: profile.id,
    member_user_id: profile.id,
    member_email: profile.email || '—',
    first_name: profile.first_name,
    last_name: profile.last_name,
    mobile: profile.mobile,
    role: isMaster ? 'master' as const : 'standard' as const,
    invited_at: '',
    accepted_at: '',
  }] : [];

  return (
    <>
      <SectionCard icon={icon} title="Team & Access" showHeader={false}>
        <section className={teamStyles.instructions} aria-labelledby="team-allowance-heading">
          <h3 id="team-allowance-heading">Your team allowance</h3>
          <ul className="list-disc pl-5 space-y-1.5 text-sm">
            <li><strong>5 people total:</strong> 1 Master Account Holder + up to 4 team members.</li>
            <li><strong>Invite User:</strong> the owner enters a name, email and phone number. The recipient signs in with that verified email and selects <strong>Accept Invitation</strong>.</li>
            <li><strong>Invitations last 14 days</strong> and reserve a place until accepted, revoked or expired. Email sign in links may expire sooner; request a fresh link if needed.</li>
            <li><strong>Accepted members have no separate expiry:</strong> access follows the owner’s account access, unless removed.</li>
            <li><strong>Manage Users:</strong> the owner can revoke invitations or remove members anytime. Their contributions and event content stay saved.</li>
            <li><strong>Members:</strong> planning across the account access, including private event data; editing and deletion where permitted.</li>
            <li><strong>Owner only:</strong> billing, purchases, team management, ownership, account security, and creating or deleting whole events.</li>
          </ul>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3" aria-label="Team places">
            <Stat label="Occupied places" value={hasData ? String(team.seats.occupied) : 'Unavailable'} sub="Accepted people, including the owner" />
            <Stat label="Reserved places" value={hasData ? String(team.seats.reserved) : 'Unavailable'} sub="Unexpired pending invitations" />
            <Stat label="Remaining places" value={hasData ? String(team.seats.remaining) : 'Unavailable'} sub="5 places total" />
            {isMaster && <div className="min-w-0 rounded-xl bg-gradient-to-b from-[#FBF8F2] to-[#F5EBDD] border border-[#CDB99E] p-3.5">
              <div className="text-[11px] uppercase tracking-wide font-medium text-muted-foreground">Invitations</div>
              {!hasData && <p className="text-xs mt-2">Invitation details unavailable.</p>}
        {hasData && isMaster && <section className={teamStyles.section} aria-labelledby="team-pending-heading">
          <h3 id="team-pending-heading">Pending invitations ({team.invitations.length})</h3>
          {team.invitations.length === 0 ? <p className={teamStyles.empty}>No pending invitations.</p> : team.invitations.map(invitation => <div key={invitation.id} className={teamStyles.row}>
            <div className={teamStyles.identity}><strong>{invitation.first_name} {invitation.last_name}</strong><span>{invitation.email}</span><span>Pending - Expires {new Date(invitation.expires_at).toLocaleString('en-AU')}</span></div>
          </div>)}
        </section>}

        {/* Master actions */}
        {isMaster && (
          <div className="mt-3 flex flex-col gap-2.5">
            <Button
              variant="outline"
              onClick={() => setDialog('invite')}
              disabled={!ready || team.seats.remaining === 0}
              className={`${controlStyles.primaryButton} w-full`}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Invite User
            </Button>
            <Button
              variant="outline"
              onClick={() => setDialog('manage')}
              disabled={!ready}
              className={`${controlStyles.secondaryButton} w-full`}
            >
              <UserCog className="w-4 h-4 mr-2" />
              Manage Users
            </Button>
          </div>
        )}

            </div>}
          </div>
          {!hasData && <p role="status">{team.loading ? 'Checking team access and current places...' : 'Current places are unavailable until team access is ready.'}</p>}
        </section>
        <div className={teamStyles.peopleTable} role="table" aria-label="People with account access">
          <div data-team-roster-header className={teamStyles.tableHeader} role="row"><span data-team-roster-label role="columnheader">Full Name</span><span data-team-roster-label role="columnheader">Email</span><span data-team-roster-label role="columnheader">Phone Number</span><span data-team-roster-label role="columnheader">Account Role</span></div>
            <div className={teamStyles.list}>{visibleMembers.map((member) => <div className={teamStyles.personRow} role="row" key={member.id}>
            <div role="cell" data-label="Full Name"><strong>{[member.first_name,member.last_name].filter(Boolean).join(' ') || 'Name not provided'}</strong></div>
            <div role="cell" data-label="Email"><span>{member.member_email}</span></div>
            <div role="cell" data-label="Phone Number"><span>{member.mobile || '—'}</span></div>
            <div className={teamStyles.roleCell} role="cell" data-label="Account Role">{member.role === 'master' ? <span data-master-account-badge className={teamStyles.badge}><Crown /> Master Account Holder</span> : <span className={teamStyles.memberBadge}>Team Member</span>} {hasData && <span className={teamStyles.memberStatus}>Accepted{member.accepted_at ? ' - ' + new Date(member.accepted_at).toLocaleDateString('en-AU') : ''}</span>}</div>
          </div>)}{visibleMembers.length === 0 && !team.error && <div className={teamStyles.emptyRoster}>{team.loading ? 'Loading account holder…' : 'No account members were returned.'}</div>}</div>
        </div>
        {team.refreshing && hasData && <p role="status">Updating team access...</p>}
        {team.error && (
          <div className={teamStyles.error} role="alert">
            <span>Team access could not load: {team.error}</span>
            {hasData && <p>Showing the last successfully loaded details. Actions are unavailable until the refresh succeeds.</p>}
            <Button type="button" className={controlStyles.secondaryButton} onClick={() => void team.refresh()}>Try Again</Button>
          </div>
        )}

      </SectionCard>
      {(ready || dialog !== null) && <TeamAccessDialog open={dialog !== null} onOpenChange={(open) => { if (!open) setDialog(null); }} mode={dialog ?? 'manage'} onChanged={team.refresh} />}
    </>
  );
};

const Stat: React.FC<{ label: string; value: string; sub?: string; className?: string }> = ({
  label, value, sub, className,
}) => (
  <div
    className={
      'rounded-xl bg-gradient-to-b from-[#FBF8F2] to-[#F5EBDD] border border-[#CDB99E] p-3.5 ' +
      (className ?? '')
    }
  >
    <div className="text-[11px] uppercase tracking-wide font-medium text-muted-foreground">{label}</div>
    <div className="mt-1 text-base sm:text-lg font-semibold text-[#2B1711] break-words">{value}</div>
    {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
  </div>
);
