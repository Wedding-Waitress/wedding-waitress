import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const ADMIN_EMAIL = 'naderelalfy1977@gmail.com';

/**
 * Returns true ONLY for the production owner admin email.
 * This is the gate for visibility of the Admin Panel link and access to /admin.
 */
export const useIsOwnerAdmin = () => {
  const [isOwnerAdmin, setIsOwnerAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const check = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!mounted) return;
        setIsOwnerAdmin(user?.email?.toLowerCase() === ADMIN_EMAIL);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    check();
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setIsOwnerAdmin(session?.user?.email?.toLowerCase() === ADMIN_EMAIL);
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  return { isOwnerAdmin, loading };
};
