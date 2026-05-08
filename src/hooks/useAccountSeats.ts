import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserPlan } from "./useUserPlan";
import { getPlanByName } from "@/lib/planRegistry";

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
  const { plan, loading: planLoading } = useUserPlan();
  const [used, setUsed] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchSeats = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setUsed(1); setLoading(false); return; }
    const { count } = await supabase
      .from("account_members" as any)
      .select("id", { count: "exact", head: true })
      .eq("account_owner_id", user.id);
    setUsed(Math.max(1, count ?? 1));
    setLoading(false);
  }, []);

  useEffect(() => { fetchSeats(); }, [fetchSeats]);

  const registry = getPlanByName(plan?.plan_name);
  const maxSeats = registry?.limits.maxUsers ?? 3;
  const remainingSeats = Math.max(0, maxSeats - used);

  return { loading: planLoading || loading, usedSeats: used, maxSeats, remainingSeats, refresh: fetchSeats };
};
