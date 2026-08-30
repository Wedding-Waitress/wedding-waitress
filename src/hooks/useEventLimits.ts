import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserPlan } from "./useUserPlan";
import { getPlanByName } from "@/lib/planRegistry";
import { EVENT_DELETED_EVENT } from '@/lib/eventDeletion';

export interface EventLimitsState {
  loading: boolean;
  includedEvents: number;
  additionalPurchased: number;
  totalAllowed: number;
  currentEvents: number;
  remaining: number;
  atCap: boolean;
  refresh: () => void;
}

export const useEventLimits = (currentEventsOverride?: number): EventLimitsState => {
  const { plan, loading: planLoading } = useUserPlan();
  const [counts, setCounts] = useState({ events: 0, additional: 0, loading: true });

  const fetchCounts = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setCounts({ events: 0, additional: 0, loading: false });
      return;
    }
    const eventsRequest = currentEventsOverride === undefined
      ? supabase.from("events").select("id", { count: "exact", head: true }).eq("user_id", user.id)
      : Promise.resolve({ count: currentEventsOverride });
    const [{ count: eventsCount }, { count: addlCount }] = await Promise.all([
      eventsRequest,
      supabase
        .from("additional_event_purchases" as any)
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "paid"),
    ]);
    setCounts({ events: eventsCount ?? 0, additional: addlCount ?? 0, loading: false });
  }, [currentEventsOverride]);

  useEffect(() => { fetchCounts(); }, [fetchCounts]);

  useEffect(() => {
    const handleEventDeleted = () => {
      setCounts((current) => ({ ...current, events: Math.max(0, current.events - 1) }));
      void fetchCounts();
    };
    window.addEventListener(EVENT_DELETED_EVENT, handleEventDeleted);
    return () => window.removeEventListener(EVENT_DELETED_EVENT, handleEventDeleted);
  }, [fetchCounts]);

  const registry = getPlanByName(plan?.plan_name);
  const includedEvents = registry?.limits.includedEvents ?? 3;
  const additionalPurchased = counts.additional;
  const totalAllowed = includedEvents + additionalPurchased;
  const currentEvents = currentEventsOverride ?? counts.events;
  const remaining = Math.max(0, totalAllowed - currentEvents);
  const atCap = currentEvents >= totalAllowed;

  return {
    loading: planLoading || counts.loading,
    includedEvents,
    additionalPurchased,
    totalAllowed,
    currentEvents,
    remaining,
    atCap,
    refresh: fetchCounts,
  };
};
