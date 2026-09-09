import React, { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, ShieldX } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { acceptTeamInvitation, previewTeamInvitation, type AccountInvitationSummary } from '@/hooks/useTeamAccess';
import { TEAM_ACCESS_ENABLED, TEAM_ACCESS_UNAVAILABLE_MESSAGE } from '@/lib/teamAccessAvailability';

export const AcceptTeamInvitation: React.FC = () => {
  const [state, setState] = useState<'working' | 'ready' | 'accepting' | 'success' | 'error'>(TEAM_ACCESS_ENABLED ? 'working' : 'error');
  const [invitation, setInvitation] = useState<(AccountInvitationSummary & { account_holder_name?: string; account_holder_email?: string }) | null>(null);
  const [message, setMessage] = useState(
    !TEAM_ACCESS_ENABLED
      ? TEAM_ACCESS_UNAVAILABLE_MESSAGE
      : 'Confirming the invitation for your signed-in email address…',
  );

  useEffect(() => {
    if (!TEAM_ACCESS_ENABLED) return;
    let active = true;
    void previewTeamInvitation().then((result) => {
      if (!active) return;
      setInvitation(result); setState('ready'); setMessage('Review the invitation details, then choose whether to accept access.');
    }).catch((error) => {
      if (!active) return;
      setState('error'); setMessage(error instanceof Error ? error.message : 'The invitation could not be accepted.');
    });
    return () => { active = false; };
  }, []);

  const accept = async () => {
    setState('accepting'); setMessage('Securely adding your signed-in email to the account…');
    try { await acceptTeamInvitation(); setState('success'); setMessage('You now have team access.'); }
    catch (error) { setState('error'); setMessage(error instanceof Error ? error.message : 'The invitation could not be accepted.'); }
  };

  return <main className="ww-application-background flex min-h-[100dvh] items-center justify-center px-4">
    <section className="ww-box w-full max-w-lg rounded-2xl p-8 text-center" aria-live="polite">
      {(state === 'working' || state === 'accepting') && <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-[#8f6245]" aria-hidden="true" />}
      {state === 'success' && <CheckCircle2 className="mx-auto mb-4 h-10 w-10 text-green-700" aria-hidden="true" />}
      {state === 'error' && <ShieldX className="mx-auto mb-4 h-10 w-10 text-red-700" aria-hidden="true" />}
      <h1 className="text-2xl font-semibold text-[#472c1d]">{state === 'success' ? 'Invitation accepted' : state === 'ready' ? 'Team access invitation' : state === 'working' || state === 'accepting' ? 'Checking invitation' : 'Invitation unavailable'}</h1>
      <p className="mt-3 text-sm text-muted-foreground">{message}</p>
      {state === 'ready' && invitation && <div className="mt-6 rounded-xl border border-[#d8ba8c] bg-[#fbf5e9] p-4 text-left text-sm text-[#472c1d]"><p className="font-semibold">{invitation.first_name} {invitation.last_name}</p><p className="mt-1">Invited by {invitation.account_holder_name || invitation.account_holder_email || 'the account holder'}</p><p className="mt-3 text-xs text-[#6e625b]">Accepting lets you work on this account’s event-planning features. It does not give you access to billing, plan purchases, ownership, account security, or team management.</p></div>}
      {state === 'ready' && <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center"><Button onClick={() => void accept()} className="bg-gradient-to-b from-[#7bd880] to-[#55a447] text-white">Accept Invitation</Button><Button asChild variant="outline"><Link to="/">Not Now</Link></Button></div>}
      {(state === 'success' || state === 'error') && <Button asChild className="mt-6"><Link to={state === 'success' ? '/dashboard' : '/'}>{state === 'success' ? 'Open Wedding Waitress' : 'Return home'}</Link></Button>}
    </section>
  </main>;
};
