import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { RefreshCcw, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { SeoHead } from '@/components/SEO/SeoHead';
import controlStyles from '@/components/Account/AccountControls.module.css';
import styles from './AccountRecovery.module.css';

type Lifecycle = { status: string; purge_after?: string | null };

const AccountRecovery: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(false);
  const [lifecycle, setLifecycle] = useState<Lifecycle | null>(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => { void (async () => {
    const { data: { session: current } } = await supabase.auth.getSession();
    setSession(!!current);
    if (current) { const { data } = await supabase.rpc('get_my_account_lifecycle' as never); setLifecycle(data as unknown as Lifecycle); }
    setLoading(false);
  })(); }, []);

  const reactivate = async () => {
    setBusy(true);
    const { error } = await supabase.rpc('reactivate_my_account' as never);
    setBusy(false);
    if (error) { toast({ title: 'Could not reactivate account', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Welcome back', description: 'Welcome back. Your Wedding Waitress account information has been restored. Your previous plan has ended, so please choose a new plan to continue.' });
    navigate('/account/plans-upgrades', { replace: true });
  };
  const logout = async () => { await supabase.auth.signOut(); navigate('/', { replace: true }); };

  if (loading) return <div className={`${styles.screen} ww-application-background`}>Checking account recovery…</div>;
  if (!session) return <Navigate to="/" replace />;
  if (lifecycle?.status === 'permanently_deleted') return <main className={`${styles.screen} ww-application-background`}><section className={styles.card}><span className={styles.eyebrow}>Recovery period ended</span><h1>Account recovery is no longer available</h1><p>The 12-month recovery deadline has passed and eligible operational information has been permanently deleted or de-identified. Records required by law may remain securely retained.</p><div className={styles.actions}><Button className={controlStyles.secondaryButton} onClick={() => void logout()}><LogOut />Log Out</Button></div></section></main>;
  if (lifecycle?.status !== 'scheduled_for_deletion') return <Navigate to="/dashboard" replace />;
  return <main className={`${styles.screen} ww-application-background`}>
    <SeoHead title="Welcome Back | Wedding Waitress" description="Reactivate your Wedding Waitress account." noIndex />
    <section className={styles.card} aria-labelledby="recovery-title">
      <span className={styles.eyebrow}>Account recovery</span>
      <h1 id="recovery-title">Welcome Back</h1>
      <p>Your Wedding Waitress account information is still available during the 12-month recovery period.</p>
      <p>Reactivation restores access to retained account and event information. Your previous plan and entitlements will not resume, and team access remains disabled until you safely re-enable it.</p>
      {lifecycle.purge_after && <p className={styles.deadline}>Recovery available until {new Date(lifecycle.purge_after).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}.</p>}
      <div className={styles.actions}>
        <Button className={controlStyles.primaryButton} disabled={busy} onClick={() => void reactivate()}><RefreshCcw />{busy ? 'Reactivating…' : 'Reactivate My Account'}</Button>
        <Button className={controlStyles.secondaryButton} disabled={busy} onClick={() => void logout()}><LogOut />Log Out</Button>
      </div>
    </section>
  </main>;
};
export default AccountRecovery;
