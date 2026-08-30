import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TEAM_ACCESS_ENABLED } from "@/lib/teamAccessAvailability";

export interface AccountSeatsState {
  loading: boolean;
  usedSeats: number;
  maxSeats: number;
  remainingSeats: number;
  refresh: () => void;
}

/**
 * Counts members of the current user's account (master + standard).
 * Always counts at least 1 (the master themselves).
 */
export const useAccountSeats = (): AccountSeatsState => {
  const [used, setUsed] = useState(1);
  const [maximum, setMaximum] = useState(3);
  const [loading, setLoading] = useState(true);

  const fetchSeats = useCallback(async () => {
    if (!TEAM_ACCESS_ENABLED) { setUsed(1); setMaximum(3); setLoading(false); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setUsed(1); setLoading(false); return; }
    const { data, error } = await supabase.functions.invoke('manage-account-members', { body: { action: 'list' } });
    if (!error && data?.seats) {
      setUsed(Math.max(1, Number(data.seats.used) || 1));
      setMaximum(Math.max(1, Number(data.seats.maximum) || 3));
    } else {
      setUsed(1);
      setMaximum(3);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchSeats(); }, [fetchSeats]);

  const maxSeats = maximum;
  const remainingSeats = Math.max(0, maxSeats - used);

  return { loading, usedSeats: used, maxSeats, remainingSeats, refresh: fetchSeats };
};
