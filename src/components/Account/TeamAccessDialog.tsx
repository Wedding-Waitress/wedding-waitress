import React, { FormEvent, useState } from 'react';
import { Clock3, Crown, MailPlus, ShieldCheck, Trash2, UserRoundMinus } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useTeamAccess } from '@/hooks/useTeamAccess';
import dialogStyles from './AccountDialog.module.css';
import controlStyles from './AccountControls.module.css';
import styles from './TeamAccessDialog.module.css';

interface Props { open: boolean; onOpenChange: (open: boolean) => void; mode?: 'invite' | 'manage'; onChanged?: () => void }

export const TeamAccessDialog: React.FC<Props> = ({ open, onOpenChange, mode = 'manage', onChanged }) => {
  const team = useTeamAccess(open);
  const { toast } = useToast();
  const [invitee, setInvitee] = useState({ firstName: '', lastName: '', email: '', mobile: '' });
  const [busyId, setBusyId] = useState<string | null>(null);

  const run = async (id: string, task: () => Promise<unknown>, success: string) => {
    setBusyId(id);
    try {
      await task();
      onChanged?.();
      toast({ title: success });
      return true;
    } catch (error) {
      toast({ title: 'Team access was not updated', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' });
      return false;
    } finally { setBusyId(null); }
  };

  const submitInvite = async (event: FormEvent) => {
    event.preventDefault();
    const sent = await run('invite', () => team.invite(invitee), 'Invitation sent');
    if (sent) setInvitee({ firstName: '', lastName: '', email: '', mobile: '' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-appearance="espresso-glass" className={`${dialogStyles.dialog} ${styles.dialog}`} overlayClassName={dialogStyles.overlay}>
        <DialogHeader>
          <div className={dialogStyles.iconWrap}><ShieldCheck /></div>
          <DialogTitle className={dialogStyles.title}>{mode === 'invite' ? 'Invite a team member' : 'Manage Team & Access'}</DialogTitle>
          <DialogDescription className={dialogStyles.description}>The master account holder controls the seats included with the current plan. Team members can work on the account but cannot manage billing, ownership or other users.</DialogDescription>
        </DialogHeader>

        <div className={styles.summary} aria-label="Account seat usage">
          <div><span>Seats used</span><strong>{team.loading ? '—' : `${team.seats.used} / ${team.seats.maximum}`}</strong></div>
          <div><span>Seats available</span><strong>{team.loading ? '—' : team.seats.remaining}</strong></div>
        </div>
        {team.error && <div className={styles.error} role="alert">{team.error}</div>}

        {mode === 'invite' && <form className={styles.inviteForm} onSubmit={submitInvite}>
          <div className={styles.fields}>
            <div className={styles.field}><label htmlFor="team-invite-first-name">First name</label><input id="team-invite-first-name" required autoComplete="given-name" maxLength={80} value={invitee.firstName} onChange={(event) => setInvitee((value) => ({ ...value, firstName: event.target.value }))} disabled={team.seats.remaining === 0 || busyId !== null} /></div>
            <div className={styles.field}><label htmlFor="team-invite-last-name">Last name</label><input id="team-invite-last-name" required autoComplete="family-name" maxLength={80} value={invitee.lastName} onChange={(event) => setInvitee((value) => ({ ...value, lastName: event.target.value }))} disabled={team.seats.remaining === 0 || busyId !== null} /></div>
            <div className={styles.field}><label htmlFor="team-invite-email">Email address</label><input id="team-invite-email" type="email" required autoComplete="email" value={invitee.email} onChange={(event) => setInvitee((value) => ({ ...value, email: event.target.value }))} placeholder="team.member@example.com" disabled={team.seats.remaining === 0 || busyId !== null} /></div>
            <div className={styles.field}><label htmlFor="team-invite-mobile">Phone number</label><input id="team-invite-mobile" type="tel" required autoComplete="tel" maxLength={30} value={invitee.mobile} onChange={(event) => setInvitee((value) => ({ ...value, mobile: event.target.value }))} placeholder="04XX XXX XXX or +61…" disabled={team.seats.remaining === 0 || busyId !== null} /></div>
          </div>
          <Button type="submit" className={controlStyles.primaryButton} disabled={team.seats.remaining === 0 || busyId !== null || Object.values(invitee).some((value) => !value.trim())}><MailPlus />{busyId === 'invite' ? 'Sending…' : 'Send Invite'}</Button>
        </form>}

        <section className={styles.section} aria-labelledby="active-team-heading"><h3 id="active-team-heading">People with access</h3>
          <div className={styles.peopleTable} role="table" aria-label="People with account access">
            <div data-team-roster-header className={styles.tableHeader} role="row"><span data-team-roster-label role="columnheader">Full Name</span><span data-team-roster-label role="columnheader">Email</span><span data-team-roster-label role="columnheader">Phone Number</span><span data-team-roster-label role="columnheader">Account Role</span></div>
            <div className={styles.list}>{team.members.map((member) => {
              const fullName = [member.first_name, member.last_name].filter(Boolean).join(' ') || 'Name not provided';
              return <div className={styles.personRow} role="row" key={member.id}>
                <div role="cell" data-label="Full Name"><strong>{fullName}</strong></div>
                <div role="cell" data-label="Email"><span>{member.member_email}</span></div>
                <div role="cell" data-label="Phone Number"><span>{member.mobile || '—'}</span></div>
                <div className={styles.roleCell} role="cell" data-label="Account Role">{member.role === 'master' ? <span className={styles.badge}><Crown /> Master Account Holder</span> : <span className={styles.memberBadge}>Team Member</span>}</div>
                {member.role !== 'master' && <div className={styles.rowActions}><Button type="button" className={controlStyles.destructiveButton} disabled={busyId !== null} onClick={() => { if (window.confirm(`Remove account access for ${member.member_email}?`)) void run(member.id, () => team.removeMember(member.id), 'Team member access removed'); }} aria-label={`Remove ${member.member_email}`}><UserRoundMinus />Remove</Button></div>}
              </div>;
            })}</div>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="pending-team-heading"><h3 id="pending-team-heading">Pending invitations</h3>
          {team.invitations.length === 0 ? <p className={styles.empty}>No pending invitations.</p> : <div className={styles.list}>{team.invitations.map((invitation) => <div className={styles.row} key={invitation.id}>
            <div className={styles.identity}><strong>{invitation.first_name} {invitation.last_name}</strong><span>{invitation.email} · {invitation.mobile}</span><span><Clock3 className="inline h-3 w-3" /> Expires {new Date(invitation.expires_at).toLocaleDateString('en-AU')}</span></div>
            <Button type="button" className={controlStyles.destructiveButton} disabled={busyId !== null} onClick={() => { if (window.confirm(`Revoke the invitation for ${invitation.email}?`)) void run(invitation.id, () => team.revokeInvitation(invitation.id), 'Invitation revoked'); }} aria-label={`Revoke invitation for ${invitation.email}`}><Trash2 />Revoke</Button>
          </div>)}</div>}
        </section>
      </DialogContent>
    </Dialog>
  );
};
