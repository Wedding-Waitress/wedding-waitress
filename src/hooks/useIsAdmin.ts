import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Session } from '@supabase/supabase-js';

// Share only concurrent checks for the exact same session, never a cached grant.
const pendingChecks = new Map<string, Promise<Awaited<ReturnType<typeof supabase.rpc>>>>();
const ownerAdminCheck = (session: Session) => {
  const key = `${session.user.id}:${session.access_token}`;
  const pending = pendingChecks.get(key);
  if (pending) return pending;
  const request = Promise.resolve(supabase.rpc('is_owner_admin'));
  pendingChecks.set(key, request);
  const clear = () => {
    if (pendingChecks.get(key) === request) pendingChecks.delete(key);
  };
  void request.then(clear, clear);
  return request;
};

export const useIsAdmin = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const requestId = useRef(0);

  const checkAdmin = useCallback(async (session: Session | null) => {
    const currentRequest = ++requestId.current;
    setLoading(true);

    try {
      if (!session) {
        if (currentRequest === requestId.current) setIsAdmin(false);
        return;
      }

      const { data, error } = await ownerAdminCheck(session);
      if (currentRequest !== requestId.current) return;

      if (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
      } else {
        setIsAdmin(data === true);
      }
    } catch (error) {
      if (currentRequest === requestId.current) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
      }
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    let receivedAuthEvent = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let currentUser: string | null = null;
    const apply = (session: Session | null) => {
      if (timer) clearTimeout(timer);
      if (session?.user.id !== currentUser) {
        ++requestId.current;
        setIsAdmin(false);
      }
      currentUser = session?.user.id ?? null;
      if (!session) { void checkAdmin(null); return; }
      // Supabase auth callbacks run under its session lock.
      timer = setTimeout(() => { if (active) void checkAdmin(session); }, 0);
    };
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      receivedAuthEvent = true;
      apply(session);
    });
    void supabase.auth.getSession().then(({ data, error }) => {
      if (active && !receivedAuthEvent) apply(error ? null : data.session);
    }).catch(() => { if (active && !receivedAuthEvent) apply(null); });

    return () => {
      active = false;
      if (timer) clearTimeout(timer);
      requestId.current += 1;
      data.subscription.unsubscribe();
    };
  }, [checkAdmin]);

  return { isAdmin, loading };
};
