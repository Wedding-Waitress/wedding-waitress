import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { clearAllCaches, registerCache } from '@/lib/cacheRegistry';
import type { AccountAccess } from '@/components/auth/SuspensionNotice';
import { useAuthenticatedCustomerActivity } from '@/hooks/useCustomerActivity';
import { useCustomerCountry } from '@/hooks/useCustomerCountry';

type AuthenticatedSessionState = {
  session: Session | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
  accountAccess: AccountAccess | null;
};

const SESSION_RESTORE_TIMEOUT_MS = 10_000;
const ACCOUNT_ACCESS_TIMEOUT_MS = 10_000;

class DashboardBootstrapTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DashboardBootstrapTimeoutError';
  }
}

const withTimeout = <T,>(promise: PromiseLike<T>, timeoutMs: number, message: string): Promise<T> => (
  new Promise<T>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new DashboardBootstrapTimeoutError(message));
    }, timeoutMs);

    Promise.resolve(promise).then(
      (value) => {
        window.clearTimeout(timeoutId);
        resolve(value);
      },
      (reason) => {
        window.clearTimeout(timeoutId);
        reject(reason);
      },
    );
  })
);

const isInvalidStoredSessionError = (value: unknown) => {
  if (!value || typeof value !== 'object') return false;
  const error = value as { code?: string; message?: string };
  const code = error.code?.toLowerCase() ?? '';
  const message = error.message?.toLowerCase() ?? '';
  return code === 'refresh_token_not_found'
    || code === 'invalid_refresh_token'
    || message.includes('invalid refresh token')
    || message.includes('refresh token not found');
};

const bootstrapErrorMessage = (value: unknown) => {
  if (value instanceof DashboardBootstrapTimeoutError) return value.message;
  return value instanceof Error && value.message
    ? value.message
    : 'Unable to restore your session.';
};

const AuthenticatedSessionContext = createContext<AuthenticatedSessionState | null>(null);

let lifecycleUserId: string | null = null;
let lifecycleStatus: string | null = null;
let lifecycleRequest: Promise<string | null> | null = null;

const clearLifecycleCache = () => {
  lifecycleUserId = null;
  lifecycleStatus = null;
  lifecycleRequest = null;
};
registerCache(clearLifecycleCache);

const readLifecycle = async (userId: string) => {
  if (lifecycleUserId === userId && lifecycleStatus !== null) return lifecycleStatus;
  if (lifecycleUserId === userId && lifecycleRequest) return lifecycleRequest;
  lifecycleUserId = userId;
  let trackedRequest: Promise<string>;
  trackedRequest = withTimeout(
    Promise.resolve().then(() => supabase.rpc('get_my_account_lifecycle' as never)),
    ACCOUNT_ACCESS_TIMEOUT_MS,
    'Account verification took too long. Please check your connection and try again.',
  )
    .then(({ data, error }) => {
      if (error) throw error;
      const status = (data as unknown as { status?: string } | null)?.status ?? 'active';
      if (lifecycleUserId === userId) lifecycleStatus = status;
      return status;
    })
    .finally(() => {
      if (lifecycleRequest === trackedRequest) lifecycleRequest = null;
    });
  lifecycleRequest = trackedRequest;
  return trackedRequest;
};

// Enable only after the matching backend migration is verified. Keep the existing
// local application available while this release is being prepared.
export const AuthenticatedSessionProvider: React.FC<React.PropsWithChildren<{ suspensionAccessEnabled?: boolean; activityTrackingEnabled?:boolean }>> = ({ children, suspensionAccessEnabled = false,activityTrackingEnabled=false }) => {
  const navigate = useNavigate();
  const mounted = useRef(true);
  const currentUserId = useRef<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [accessLoading, setAccessLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [accountAccess, setAccountAccess] = useState<AccountAccess | null>(null);
  const [suspensionLoading, setSuspensionLoading] = useState(true);
  const [accountAccessError, setAccountAccessError] = useState<string | null>(null);
  const previousAccessStatus = useRef<AccountAccess['status'] | null>(null);
  useAuthenticatedCustomerActivity(session?.user.id||null,activityTrackingEnabled&&!sessionLoading&&!accessLoading&&!error&&(!accountAccess||accountAccess.status==='active'));
  useCustomerCountry(session?.user.id||null,activityTrackingEnabled&&!sessionLoading&&!accessLoading&&!error&&accountAccess?.status==='active');

  useEffect(() => {
    if (!suspensionAccessEnabled) {
      // Discard only state from the unreleased optional check when its release
      // flag is disabled (including state retained by Fast Refresh). Existing
      // authenticated session/lifecycle verification remains authoritative.
      setAccountAccess(null);setAccountAccessError(null);previousAccessStatus.current=null;
      setSuspensionLoading(false);return;
    }
    if (sessionLoading) return;
    if (!session) { setAccountAccess(null); setSuspensionLoading(false); return; }
    let active = true;
    let checking = false;
    setSuspensionLoading(true);
    setAccountAccess(null);
    const check = async () => {
      if (checking) return;
      checking = true;
      try {
        const { data, error: accessError } = await withTimeout(
          supabase.rpc('get_my_account_access' as never), ACCOUNT_ACCESS_TIMEOUT_MS,
          'Account verification took too long. Please check your connection and try again.',
        );
        if (accessError) throw accessError;
        const access = data as unknown as AccountAccess;
        if (!access || !['active', 'suspended', 'pending_review', 'admin_deleted'].includes(access.status)) throw new Error('Invalid access response');
        if (!active) return;
        if (previousAccessStatus.current !== access.status) clearAllCaches();
        previousAccessStatus.current = access.status;
        setAccountAccess(access);
        if (access.status !== 'active') navigate('/dashboard?tab=my-events', { replace: true });
        setAccountAccessError(null);
      } catch {
        if (active) { clearAllCaches(); setAccountAccessError('Unable to verify account access. Please try again.'); }
      } finally { checking = false; if (active) setSuspensionLoading(false); }
    };
    void check();
    const interval = window.setInterval(() => void check(), 5000);
    const focus = () => void check();
    window.addEventListener('focus', focus);
    document.addEventListener('visibilitychange', focus);
    return () => { active = false; window.clearInterval(interval); window.removeEventListener('focus', focus); document.removeEventListener('visibilitychange', focus); };
  }, [session?.user.id, sessionLoading, attempt, navigate, suspensionAccessEnabled]);

  const applySession = useCallback((nextSession: Session | null, clearBootstrapError = false) => {
    if (!mounted.current) return;
    const nextUserId = nextSession?.user.id ?? null;
    const previousUserId = currentUserId.current;
    if (previousUserId !== nextUserId) {
      if (!nextUserId && previousUserId) {
        window.dispatchEvent(new Event('ww:auth-cleared'));
      } else {
        clearAllCaches();
      }
      setAccessLoading(Boolean(nextSession));
    }
    if (!nextUserId && previousUserId) {
      clearLifecycleCache();
    }
    currentUserId.current = nextUserId;
    setSession(nextSession);
    setSessionLoading(false);
    setError((currentError) => (
      clearBootstrapError || (currentError && (
        (!nextUserId && Boolean(previousUserId))
        || (Boolean(nextUserId) && previousUserId !== nextUserId)
      ))
        ? null
        : currentError
    ));
  }, []);

  useEffect(() => {
    mounted.current = true;
    let active = true;
    let resolvedByAuthEvent = false;
    let subscription: { unsubscribe: () => void } | null = null;
    setSessionLoading(true);
    setError(null);
    try {
      const authStateChange = supabase.auth.onAuthStateChange((event, nextSession) => {
        if (!active) return;
        resolvedByAuthEvent = true;
        applySession(nextSession, event === 'INITIAL_SESSION' || event === 'SIGNED_OUT');
      });
      subscription = authStateChange.data.subscription;
    } catch (sessionError: unknown) {
      setAccessLoading(false);
      setError(bootstrapErrorMessage(sessionError));
      setSessionLoading(false);
      return () => {
        active = false;
        mounted.current = false;
      };
    }
    void withTimeout(
      Promise.resolve().then(() => supabase.auth.getSession()),
      SESSION_RESTORE_TIMEOUT_MS,
      'Session restoration took too long. Please check your connection and try again.',
    )
      .then(({ data, error: sessionError }) => {
        if (!active || !mounted.current || resolvedByAuthEvent) return;
        if (sessionError) {
          if (isInvalidStoredSessionError(sessionError)) {
            applySession(null);
            return;
          }
          throw sessionError;
        }
        applySession(data.session);
      })
      .catch((sessionError: unknown) => {
        if (!active || !mounted.current || resolvedByAuthEvent) return;
        setAccessLoading(false);
        setError(bootstrapErrorMessage(sessionError));
        setSessionLoading(false);
      });
    return () => {
      active = false;
      mounted.current = false;
      subscription?.unsubscribe();
    };
  }, [applySession, attempt]);

  useEffect(() => {
    if (sessionLoading) return;
    if (suspensionAccessEnabled && (!accountAccess || accountAccess.status !== 'active')) { setAccessLoading(false); return; }
    if (error) { setAccessLoading(false); return; }
    if (!session) {
      setAccessLoading(false);
      return;
    }
    let active = true;
    const hasCachedLifecycle = lifecycleUserId === session.user.id && lifecycleStatus !== null;
    setAccessLoading(!hasCachedLifecycle);
    void readLifecycle(session.user.id)
      .then((status) => {
        if (!active) return;
        if (status === 'scheduled_for_deletion' || status === 'permanently_deleted') {
          navigate('/account-recovery', { replace: true });
        }
        setAccessLoading(false);
      })
      .catch((lifecycleError: unknown) => {
        if (!active) return;
        setError(lifecycleError instanceof DashboardBootstrapTimeoutError
          ? lifecycleError.message
          : 'Unable to verify account access.');
      })
      .finally(() => {
        if (active) setAccessLoading(false);
      });
    return () => { active = false; };
  }, [error, navigate, session, sessionLoading, accountAccess?.status, suspensionAccessEnabled]);

  const retry = useCallback(() => {
    clearLifecycleCache();
    setError(null);
    setAccessLoading(false);
    setSessionLoading(true);
    setAttempt((value) => value + 1);
  }, []);
  return (
    <AuthenticatedSessionContext.Provider value={{ session, loading: sessionLoading || accessLoading || suspensionLoading, error: error || (suspensionAccessEnabled ? accountAccessError : null), retry, accountAccess: suspensionAccessEnabled ? accountAccess : null }}>
      <React.Fragment key={session?.user.id ?? 'anonymous'}>{children}</React.Fragment>
    </AuthenticatedSessionContext.Provider>
  );
};

export const useAuthenticatedSession = () => {
  const value = useContext(AuthenticatedSessionContext);
  if (!value) throw new Error('useDashboardSession must be used inside AuthenticatedSessionProvider.');
  return value;
};
