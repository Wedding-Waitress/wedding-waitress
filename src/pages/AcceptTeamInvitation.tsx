import React, { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, ShieldX } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { acceptTeamInvitation } from '@/hooks/useTeamAccess';
import { TEAM_ACCESS_ENABLED, TEAM_ACCESS_UNAVAILABLE_MESSAGE } from '@/lib/teamAccessAvailability';

export const AcceptTeamInvitation: React.FC = () => {
  const [state, setState] = useState<'working' | 'success' | 'error'>(TEAM_ACCESS_ENABLED ? 'working' : 'error');
  const [message, setMessage] = useState(
    !TEAM_ACCESS_ENABLED
      ? TEAM_ACCESS_UNAVAILABLE_MESSAGE
      : 'Confirming the invitation for your signed-in email address…',
  );

  useEffect(() => {
    if (!TEAM_ACCESS_ENABLED) return;
    let active = true;
    void acceptTeamInvitation().then(() => {
      if (!active) return;
      setState('success'); setMessage('You now have team access.');
    }).catch((error) => {
      if (!active) return;
      setState('error'); setMessage(error instanceof Error ? error.message : 'The invitation could not be accepted.');
    });
    return () => { active = false; };
  }, []);

  return <main className="ww-application-background flex min-h-[100dvh] items-center justify-center px-4">
    <section className="ww-box w-full max-w-lg rounded-2xl p-8 text-center" aria-live="polite">
      {state === 'working' && <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-[#8f6245]" aria-hidden="true" />}
      {state === 'success' && <CheckCircle2 className="mx-auto mb-4 h-10 w-10 text-green-700" aria-hidden="true" />}
      {state === 'error' && <ShieldX className="mx-auto mb-4 h-10 w-10 text-red-700" aria-hidden="true" />}
      <h1 className="text-2xl font-semibold text-[#472c1d]">{state === 'success' ? 'Invitation accepted' : state === 'working' ? 'Joining account' : 'Invitation unavailable'}</h1>
      <p className="mt-3 text-sm text-muted-foreground">{message}</p>
      {state !== 'working' && <Button asChild className="mt-6"><Link to={state === 'success' ? '/dashboard' : '/'}>{state === 'success' ? 'Open Wedding Waitress' : 'Return home'}</Link></Button>}
    </section>
  </main>;
};
