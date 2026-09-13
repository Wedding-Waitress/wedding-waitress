import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import styles from './SuspensionNotice.module.css';
// Always ask the server before mounting authenticated contexts, onboarding,
// billing recovery or admin data. No email or client owner claim is consulted.
export function PrelaunchAccessGate({ children }: React.PropsWithChildren) {
  const [decision, setDecision] = useState<'checking'|'allowed'|'held'|'error'>('checking');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true, sequence = 0;
    const check = async () => {
      const current = ++sequence;
      try {
        const { data, error } = await Promise.race([
          Promise.resolve(supabase.rpc('get_prelaunch_access' as never)),
          new Promise<never>((_, reject) => window.setTimeout(() => reject(new Error('Access check timed out')), 10000)),
        ]);
        if (error || typeof (data as { allowed?: unknown })?.allowed !== 'boolean') throw new Error('Unverified hold');
        if (active && sequence === current) setDecision((data as unknown as {allowed:boolean}).allowed ? 'allowed' : 'held');
      } catch { if (active && sequence === current) setDecision('error'); }
    };
    void check();
    const interval = window.setInterval(() => void check(), 30000);
    const focus = () => { if (document.visibilityState !== 'hidden') void check(); };
    window.addEventListener('focus', focus);
    // Do not issue Supabase calls inside its Auth state-change callback lock.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => { setDecision('checking'); window.setTimeout(() => { if (active) void check(); }, 0); });
    return () => { active = false; ++sequence; window.clearInterval(interval); window.removeEventListener('focus', focus); subscription.unsubscribe(); };
  }, [attempt]);
  if (decision === 'allowed') return <>{children}</>;
  return <main className={styles.surface} data-prelaunch-access-notice><section className={styles.card}>
    <h1>{decision === 'checking' ? 'Checking your access…' : decision === 'error' ? 'Access could not be verified' : 'Wedding Waitress is launching soon'}</h1>
    {decision === 'held' && <p>Planning and account tools are not open yet. Your existing information is preserved. Only the verified platform owner has access during pre-launch.</p>}
    {decision === 'error' && <p role="alert">No access has been granted. Please try again.</p>}
    {decision !== 'checking' && <><button onClick={() => setAttempt(value => value + 1)}>Try again</button><Link to="/">Return to homepage</Link></>}
  </section></main>;
}
