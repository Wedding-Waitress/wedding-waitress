import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useIsAdmin = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const requestId = useRef(0);

  const checkAdmin = useCallback(async (hasSession?: boolean) => {
    const currentRequest = ++requestId.current;
    setLoading(true);

    try {
      let authenticated = hasSession;
      if (authenticated === undefined) {
        const { data, error } = await supabase.auth.getSession();
        authenticated = !error && !!data.session;
      }

      if (!authenticated) {
        if (currentRequest === requestId.current) setIsAdmin(false);
        return;
      }

      const { data, error } = await supabase.rpc('is_owner_admin');
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
    void checkAdmin();
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      void checkAdmin(!!session);
    });

    return () => {
      requestId.current += 1;
      data.subscription.unsubscribe();
    };
  }, [checkAdmin]);

  return { isAdmin, loading };
};
