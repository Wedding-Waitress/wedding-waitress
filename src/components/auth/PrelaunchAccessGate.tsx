import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { DashboardLoadingScreen, getDashboardLoadingAppearance } from '@/components/Dashboard/DashboardLoadingScreen';
import { supabase } from '@/integrations/supabase/client';
import styles from './SuspensionNotice.module.css';
import { accessTimingNow, recordAccessTiming } from '@/lib/accessVerificationTimings';

type AccessDecision = 'checking' | 'allowed' | 'held' | 'unavailable';
type AuthState = 'resolving' | 'authenticated' | 'anonymous';
// Gateway logs contain successful checks taking up to 24.5s. Keep access blocked
// while awaiting the real decision rather than aborting valid checks at 10s.
const ACCESS_TIMEOUT_MS = 30_000;
const TRANSIENT_RETRY_MS = 5_000;

// This gate relies on the server's private UUID-based entitlement. It owns only
// presentation state; database RLS and RPC checks remain authoritative.
export function PrelaunchAccessGate({ children }: React.PropsWithChildren) {
  const location = useLocation();
  const [decision, setDecision] = useState<AccessDecision>('checking');
  const [authState, setAuthState] = useState<AuthState>('resolving');
  const [attempt, setAttempt] = useState(0);
  const decisionRef = useRef<AccessDecision>('checking');
  const authUserIdRef = useRef<string | null>(null);
  const verifiedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    let requestSequence = 0;
    let inFlight = false;
    let inFlightUserId: string | null = null;
    let authEventReceived = false;
    let checkTimer: number | null = null;
    let timeoutTimer: number | null = null;
    let requestController: AbortController | null = null;
    let queued = false;
    let transientFailures = 0;
    let retryTimer: number | null = null;
    const bootstrapStart = accessTimingNow();
    let bootstrapRecorded = false;

    const publish = (next: AccessDecision) => {
      decisionRef.current = next;
      setDecision(next);
    };
    const clearRetry = () => {
      if (retryTimer !== null) {
        window.clearTimeout(retryTimer);
        retryTimer = null;
      }
    };
    const scheduleRetry = (check: () => void) => {
      clearRetry();
      const delay = Math.min(TRANSIENT_RETRY_MS * 2 ** Math.min(transientFailures, 4), 60_000);
      transientFailures += 1;
      retryTimer = window.setTimeout(() => {
        retryTimer = null;
        if (active && authUserIdRef.current) check();
      }, delay);
    };

    const check = () => {
      const requestUserId = authUserIdRef.current;
      if (!requestUserId) return;
      if (inFlight) {
        queued = inFlightUserId !== requestUserId;
        return;
      }
      inFlight = true;
      inFlightUserId = requestUserId;
      const requestId = ++requestSequence;
      clearRetry();
      requestController = new AbortController();
      const controller = requestController;
      const requestStart = accessTimingNow();

      void Promise.race([
        Promise.resolve().then(() => {
          const request = supabase.rpc('get_prelaunch_access' as never);
          return typeof request.abortSignal === 'function' ? request.abortSignal(controller.signal) : request;
        }),
        new Promise<never>((_, reject) => {
          timeoutTimer = window.setTimeout(() => {
            controller.abort();
            reject(new Error('Access check timed out'));
          }, ACCESS_TIMEOUT_MS);
        }),
      ])
        .then(({ data, error }) => {
          if (error || typeof (data as { allowed?: unknown })?.allowed !== 'boolean') {
            throw error || new Error('Access decision was unavailable');
          }
          if (!active || requestId !== requestSequence || authUserIdRef.current !== requestUserId) return;
          recordAccessTiming('access-check', requestStart, (data as { allowed: boolean }).allowed ? 'allowed' : 'denied');
          transientFailures = 0;
          verifiedUserIdRef.current = requestUserId;
          publish((data as { allowed: boolean }).allowed ? 'allowed' : 'held');
        })
        .catch((error: unknown) => {
          if (!active || requestId !== requestSequence || authUserIdRef.current !== requestUserId) return;
          recordAccessTiming('access-check', requestStart, 'failed');
          console.warn('Prelaunch access verification failed', { message: (error as { message?: string })?.message || 'Access request failed', code: (error as { code?: string })?.code, userId: requestUserId, timeoutMs: ACCESS_TIMEOUT_MS });
          // A prior server-approved decision remains visible while a transient
          // network/RPC failure retries. It must never become a client denial.
          if (decisionRef.current !== 'allowed' || verifiedUserIdRef.current !== requestUserId) {
            publish('unavailable');
          }
          scheduleRetry(check);
        })
        .finally(() => {
          if (timeoutTimer !== null) window.clearTimeout(timeoutTimer);
          timeoutTimer = null;
          inFlight = false;
          inFlightUserId = null;
          requestController = null;
          if (!active) return;
          if (queued) {
            queued = false;
            check();
          }
        });
    };

    // Auth callbacks run under the auth client's session lock. Defer requests
    // until that callback has returned, and combine duplicate bootstrap signals.
    const deferCheck = () => {
      if (checkTimer !== null) return;
      checkTimer = window.setTimeout(() => {
        checkTimer = null;
        if (active) check();
      }, 0);
    };

    const applyAuthState = (nextUserId: string | null) => {
      if (!bootstrapRecorded) { recordAccessTiming('auth-bootstrap', bootstrapStart, nextUserId ? 'authenticated' : 'anonymous'); bootstrapRecorded = true; }
      const previousUserId = authUserIdRef.current;
      const accountChanged = previousUserId !== nextUserId;
      authUserIdRef.current = nextUserId;
      setAuthState(nextUserId ? 'authenticated' : 'anonymous');

      if (!nextUserId) {
        verifiedUserIdRef.current = null;
        requestSequence += 1;
        requestController?.abort();
        clearRetry();
        publish('checking');
        return;
      }

      if (accountChanged) {
        requestSequence += 1;
        requestController?.abort();
        verifiedUserIdRef.current = null;
        publish('checking');
      }

      deferCheck();
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      authEventReceived = true;
      applyAuthState(session?.user.id ?? null);
    });

    // getSession is a bootstrap signal. The protected route and all data calls
    // still independently enforce authentication and backend access controls.
    void supabase.auth.getSession()
      .then(({ data, error }) => {
        if (!active || error || authEventReceived) return;
        applyAuthState(data.session?.user.id ?? null);
      })
      .catch(() => { if (active && !authEventReceived) setAuthState('anonymous'); });

    const resume = () => {
      if (document.visibilityState !== 'hidden') check();
    };
    const interval = window.setInterval(check, 30_000);
    window.addEventListener('focus', resume);
    window.addEventListener('online', resume);
    document.addEventListener('visibilitychange', resume);
    return () => {
      active = false;
      requestSequence += 1;
      clearRetry();
      if (checkTimer !== null) window.clearTimeout(checkTimer);
      if (timeoutTimer !== null) window.clearTimeout(timeoutTimer);
      requestController?.abort();
      window.clearInterval(interval);
      window.removeEventListener('focus', resume);
      window.removeEventListener('online', resume);
      document.removeEventListener('visibilitychange', resume);
      subscription.unsubscribe();
    };
  }, [attempt]);

  if (authState === 'resolving' || (authState === 'authenticated' && decision === 'checking')) {
    return <DashboardLoadingScreen appearance={getDashboardLoadingAppearance(location.pathname, location.search)} />;
  }
  if (authState === 'anonymous' || decision === 'allowed') return <>{children}</>;
  if (decision === 'held') {
    return <main className={styles.surface} data-prelaunch-access-notice><section className={styles.card}>
      <h1>Wedding Waitress is launching soon</h1>
      <p>Planning and account tools are not open yet. Your existing information is preserved. Only the verified platform owner has access during pre-launch.</p>
      <Link to="/">Return to homepage</Link>
    </section></main>;
  }
  return <main className={styles.surface} data-prelaunch-access-notice><section className={styles.card}>
    <h1>Access verification is temporarily unavailable</h1>
    <p role="status">Your verified access has not been changed. Please check your connection while we retry.</p>
    <button onClick={() => { decisionRef.current = 'checking'; setDecision('checking'); setAttempt(value => value + 1); }}>Try again</button><Link to="/">Return to homepage</Link>
  </section></main>;
}
