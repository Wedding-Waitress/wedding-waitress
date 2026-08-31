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
  const [email, setEmail] = useState('');
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
    if (!email.trim()) return;
    const sent = await run('invite', () => team.invite(email), 'Invitation sent');
    if (sent) setEmail('');
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

        <form className={styles.inviteForm} onSubmit={submitInvite}>
          <div className={styles.field}><label htmlFor="team-invite-email">Email address</label><input id="team-invite-email" type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="team.member@example.com" disabled={team.seats.remaining === 0 || busyId !== null} /></div>
          <Button type="submit" className={controlStyles.primaryButton} disabled={team.seats.remaining === 0 || busyId !== null || !email.trim()}><MailPlus />{busyId === 'invite' ? 'Sending…' : 'Send Invite'}</Button>
        </form>

        <section className={styles.section} aria-labelledby="active-team-heading"><h3 id="active-team-heading">People with access</h3>
          <div className={styles.list}>{team.members.map((member) => <div className={styles.row} key={member.id}>
            <div className={styles.identity}><strong>{member.member_email}</strong><span>{member.role === 'master' ? 'Account holder' : 'Team member'}</span></div>
            {member.role === 'master' ? <span className={styles.badge}><Crown /> Master</span> : <Button type="button" className={controlStyles.destructiveButton} disabled={busyId !== null} onClick={() => { if (window.confirm(`Remove account access for ${member.member_email}?`)) void run(member.id, () => team.removeMember(member.id), 'Team member access removed'); }} aria-label={`Remove ${member.member_email}`}><UserRoundMinus />Remove</Button>}
          </div>)}</div>
        </section>

        <section className={styles.section} aria-labelledby="pending-team-heading"><h3 id="pending-team-heading">Pending invitations</h3>
          {team.invitations.length === 0 ? <p className={styles.empty}>No pending invitations.</p> : <div className={styles.list}>{team.invitations.map((invitation) => <div className={styles.row} key={invitation.id}>
            <div className={styles.identity}><strong>{invitation.email}</strong><span><Clock3 className="inline h-3 w-3" /> Expires {new Date(invitation.expires_at).toLocaleDateString('en-AU')}</span></div>
            <Button type="button" className={controlStyles.destructiveButton} disabled={busyId !== null} onClick={() => { if (window.confirm(`Revoke the invitation for ${invitation.email}?`)) void run(invitation.id, () => team.revokeInvitation(invitation.id), 'Invitation revoked'); }} aria-label={`Revoke invitation for ${invitation.email}`}><Trash2 />Revoke</Button>
          </div>)}</div>}
        </section>
      </DialogContent>
    </Dialog>
  );
};
