import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { isAdminEmail, isAdminUserId } from '@/lib/adminConfig';

export const useIsAdmin = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error || !user) {
          setIsAdmin(false);
          setLoading(false);
          return;
        }

        // Check both email and user ID
        const adminByEmail = isAdminEmail(user.email);
        const adminById = isAdminUserId(user.id);
        
        setIsAdmin(adminByEmail || adminById);
      } catch (err) {
        console.error('Error checking admin status:', err);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdmin();
  }, []);

  return { isAdmin, loading };
};
