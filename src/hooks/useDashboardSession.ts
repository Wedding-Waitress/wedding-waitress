import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export const useDashboardSession = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessChecking, setAccessChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    let resolvedByAuthEvent = false;

    setLoading(true);
    setError(null);

    const applySession = (nextSession: Session | null) => {
      if (!active) return;
      setSession(nextSession);
      setAccessChecking(!!nextSession);
      setError(null);
      setLoading(false);
      if (!nextSession) navigate('/');
    };

    // Subscribe first so INITIAL_SESSION can complete dashboard startup even if
    // the direct storage-backed getSession request rejects or remains pending.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      resolvedByAuthEvent = true;
      applySession(nextSession);
    });

    void supabase.auth.getSession()
      .then(({ data, error: sessionError }) => {
        if (!active || resolvedByAuthEvent) return;
        if (sessionError) {
          setError(sessionError.message || 'Unable to restore your dashboard session.');
          setLoading(false);
          return;
        }
        applySession(data.session);
      })
      .catch((sessionError: unknown) => {
        if (!active || resolvedByAuthEvent) return;
        setError(sessionError instanceof Error
          ? sessionError.message
          : 'Unable to restore your dashboard session.');
        setLoading(false);
      });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [attempt, navigate]);

  const retry = useCallback(() => setAttempt((current) => current + 1), []);

  useEffect(() => {
    if (!session) { setAccessChecking(false); return; }
    if (typeof supabase.rpc !== 'function') { setAccessChecking(false); return; }
    let active = true;
    void supabase.rpc('get_my_account_lifecycle' as never).then(({ data }) => {
      const lifecycle = data as unknown as { status?: string } | null;
      if (!active) return;
      if (lifecycle?.status === 'scheduled_for_deletion' || lifecycle?.status === 'permanently_deleted') navigate('/account-recovery', { replace: true });
      setAccessChecking(false);
    }).catch(() => { if (active) { setError('Unable to verify account access.'); setAccessChecking(false); } });
    return () => { active = false; };
  }, [navigate, session]);

  return { session, loading: loading || accessChecking, error, retry };
};
