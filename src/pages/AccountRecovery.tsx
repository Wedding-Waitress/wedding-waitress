import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { RefreshCcw, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { SeoHead } from '@/components/SEO/SeoHead';
import controlStyles from '@/components/Account/AccountControls.module.css';
import styles from './AccountRecovery.module.css';
import { validateAccountReturnEligibility, type AccountReturnEligibility } from '@/lib/accountReturnEligibility';
import { AccountRenewalPackages } from '@/components/Account/AccountRenewalPackages';
import { clearAllCaches } from '@/lib/cacheRegistry';

type Lifecycle = { status: string; purge_after?: string | null; admin_deleted_at?: string | null; ordinary_closed_at?: string | null };

const AccountRecovery: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(false);
  const [lifecycle, setLifecycle] = useState<Lifecycle | null>(null);
  const [busy, setBusy] = useState(false);
  const [eligibility, setEligibility] = useState<AccountReturnEligibility | null>(null);
  const [recoveryError, setRecoveryError] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => { void (async () => {
    const { data: { session: current } } = await supabase.auth.getSession();
    setSession(!!current);
    if (current) {
      const { data, error } = await supabase.rpc('get_my_account_lifecycle' as never);
      if (error) setRecoveryError('Account recovery could not be verified. Please try again later.');
      const row = data as unknown as Lifecycle;
      setLifecycle(row);
      if (row?.ordinary_closed_at && !row.admin_deleted_at) {
        const { data: decision, error: decisionError } = await supabase.rpc('get_my_account_return_eligibility' as never);
        const verified = validateAccountReturnEligibility(decision);
        if (decisionError || !verified) setRecoveryError('Your original entitlement could not be verified. No access has been restored.');
        else setEligibility(verified);
      }
    }
    setLoading(false);
  })(); }, []);

  const reactivate = async () => {
    if (lifecycle?.admin_deleted_at || (lifecycle?.ordinary_closed_at && eligibility?.can_reopen !== true)) return;
    setBusy(true);
    const { error } = await supabase.rpc('reactivate_my_account' as never);
    setBusy(false);
    if (error) { toast({ title: 'Could not reactivate account', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Welcome back', description: lifecycle?.ordinary_closed_at
      ? 'Your remaining original access period is available. The original expiry date has not changed.'
      : 'Welcome back. Your Wedding Waitress account information has been restored. Your previous plan has ended, so please review your plan details to continue.' });
    clearAllCaches();
    // Remount the authenticated provider so its in-memory lifecycle decision is
    // fetched again; clearing only the shared cache does not reset provider state.
    window.location.replace(lifecycle?.ordinary_closed_at ? '/dashboard' : '/account/plan-billing');
  };
  const logout = async () => { await supabase.auth.signOut(); navigate('/', { replace: true }); };

  if (loading) return <div className={`${styles.screen} ww-application-background`}>Checking account recovery…</div>;
  if (!session) return <Navigate to="/" replace />;
  if (recoveryError) return <main className={`${styles.screen} ww-application-background`}><section className={styles.card}>
    <h1>Account recovery unavailable</h1><p role="alert">{recoveryError}</p>
    <Button className={controlStyles.secondaryButton} onClick={() => void logout()}><LogOut />Log Out</Button>
  </section></main>;
  if (lifecycle?.admin_deleted_at) return <main className={`${styles.screen} ww-application-background`}><section className={styles.card}><span className={styles.eyebrow}>Deleted account</span><h1>This account has been deactivated</h1><p>Your account information is securely retained for administration. Only the Wedding Waitress platform owner may restore access; you cannot reactivate this account yourself.</p><div className={styles.actions}><Button className={controlStyles.secondaryButton} onClick={() => void logout()}><LogOut />Log Out</Button></div></section></main>;
  if (lifecycle?.status === 'permanently_deleted') return <main className={`${styles.screen} ww-application-background`}><section className={styles.card}><span className={styles.eyebrow}>Recovery period ended</span><h1>Account recovery is no longer available</h1><p>The 12-month recovery deadline has passed and eligible operational information has been permanently deleted or de-identified. Records required by law may remain securely retained.</p><div className={styles.actions}><Button className={controlStyles.secondaryButton} onClick={() => void logout()}><LogOut />Log Out</Button></div></section></main>;
  if (lifecycle?.status !== 'scheduled_for_deletion') return <Navigate to="/dashboard" replace />;
  if (lifecycle.ordinary_closed_at) return <main className={`${styles.screen} ww-application-background`}>
    <SeoHead title="Welcome Back | Wedding Waitress" description="Reopen your retained Wedding Waitress account." noIndex />
    <section className={styles.card}>
      <h1>Welcome Back</h1>
      <p>Your saved account and event information remains retained. Closure does not pause, restart or extend your original paid term or trial.</p>
      {eligibility?.admin_blocked ? <p>Only the Wedding Waitress platform owner may restore this account.</p>
        : eligibility?.renewal_required ? <AccountRenewalPackages />
        : eligibility?.can_reopen ? <>
          <p>Your original {eligibility.entitlement_kind === 'trial' ? 'trial' : 'paid term'} ends on {new Date(eligibility.entitlement_until ?? eligibility.paid_until!).toLocaleString('en-AU', { dateStyle: 'long', timeStyle: 'short' })}. You can reopen for the remaining time {eligibility.entitlement_kind === 'trial' ? 'without restarting your trial' : 'without paying again'}.</p>
          <Button className={controlStyles.primaryButton} disabled={busy} onClick={() => void reactivate()}><RefreshCcw />{busy ? 'Reopening…' : 'Reopen My Account'}</Button>
        </> : <p role="alert">Your paid entitlement could not be verified. No access has been restored.</p>}
      <div className={styles.actions}><Button className={controlStyles.secondaryButton} disabled={busy} onClick={() => void logout()}><LogOut />Exit / Not Now</Button></div>
    </section>
  </main>;
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
