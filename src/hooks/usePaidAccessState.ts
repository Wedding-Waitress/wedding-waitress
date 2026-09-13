import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PaidAccessState {
  account_owner_id?: string;
  plan_name?: string;
  expires_at?: string;
  recovery_ends_at?: string;
  paid_plan: boolean;
  expired: boolean;
  recoverable: boolean;
}

export const usePaidAccessState = () => {
  const [state, setState] = useState<PaidAccessState | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    void (supabase as any).rpc('get_my_paid_access_state').then(({ data, error }: { data: PaidAccessState | null; error: unknown }) => {
      if (!active) return;
      if (error) {
        // Fail open during the prepared migration rollout. Database RLS remains
        // the authoritative access boundary once the migration is active.
        setState(null);
      } else {
        setState(data);
      }
      setLoading(false);
    }).catch(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  return { state, loading };
};
