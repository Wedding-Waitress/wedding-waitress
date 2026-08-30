import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserPlan } from "./useUserPlan";
import { getPlanByName } from "@/lib/planRegistry";
import { EVENT_DELETED_EVENT } from '@/lib/eventDeletion';

export interface EventLimitsState {
  loading: boolean;
  eventsError: string | null;
  additionalEventsError: string | null;
  guestsError: string | null;
  includedEvents: number;
  additionalPurchased: number;
  totalAllowed: number;
  currentEvents: number;
  totalGuests: number;
  remaining: number;
  atCap: boolean;
  refresh: () => void;
}

interface UsageCounts {
  events: number;
  additional: number;
  guests: number;
  eventsError: string | null;
  additionalEventsError: string | null;
  guestsError: string | null;
  loading: boolean;
}

const initialCounts: UsageCounts = {
  events: 0,
  additional: 0,
  guests: 0,
  eventsError: null,
  additionalEventsError: null,
  guestsError: null,
  loading: true,
};

const countErrorMessage = (label: string) => `Unable to load ${label}.`;

export const useEventLimits = (currentEventsOverride?: number): EventLimitsState => {
  const { plan, loading: planLoading } = useUserPlan();
  const [counts, setCounts] = useState<UsageCounts>(initialCounts);

  const fetchCounts = useCallback(async () => {
    setCounts((current) => ({ ...current, loading: true }));

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) {
      console.error('Unable to identify the account for usage totals:', authError);
      setCounts({
        ...initialCounts,
        eventsError: countErrorMessage('event usage'),
        additionalEventsError: countErrorMessage('additional event purchases'),
        guestsError: countErrorMessage('guest usage'),
        loading: false,
      });
      return;
    }
    if (!user) {
      setCounts({ ...initialCounts, loading: false });
      return;
    }

    // Standard users share the master account's allowances and usage. Accounts
    // created before team access existed may have no membership row, in which
    // case the authenticated user remains the owner.
    const { data: membership, error: membershipError } = await supabase
      .from("account_members" as any)
      .select("account_owner_id")
      .eq("member_user_id", user.id)
      .is("access_disabled_at", null)
      .order("invited_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    const ownerId = (membership as { account_owner_id?: string } | null)?.account_owner_id ?? user.id;
    if (membershipError) {
      console.warn('Account membership was unavailable; using legacy owner usage scope.', membershipError);
    }

    const additionalRequest = supabase
      .from("additional_event_purchases" as any)
      .select("id", { count: "exact", head: true })
      .eq("user_id", ownerId)
      .eq("status", "paid");
    // Fetch the small event ID list as well as its exact count. Guest usage is
    // account/event scoped, not guest-row creator scoped, so this also includes
    // guests added by standard team members.
    const eventsResult = await supabase
      .from("events")
      .select("id", { count: "exact" })
      .eq("user_id", ownerId);
    const eventIds = (eventsResult.data ?? []).map(({ id }) => id);
    const guestsRequest = eventsResult.error
      ? Promise.resolve({ count: null, error: eventsResult.error })
      : eventIds.length === 0
        ? Promise.resolve({ count: 0, error: null })
        : supabase
            .from("guests")
            .select("id", { count: "exact", head: true })
            .in("event_id", eventIds);
    const [additionalResult, guestsResult] = await Promise.all([additionalRequest, guestsRequest]);

    if (eventsResult.error) console.error('Unable to load event usage:', eventsResult.error);
    if (additionalResult.error) console.error('Unable to load additional event purchases:', additionalResult.error);
    if (guestsResult.error) console.error('Unable to load guest usage:', guestsResult.error);

    setCounts({
      events: currentEventsOverride ?? eventsResult.count ?? 0,
      additional: additionalResult.count ?? 0,
      guests: guestsResult.count ?? 0,
      eventsError: eventsResult.error ? countErrorMessage('event usage') : null,
      additionalEventsError: additionalResult.error ? countErrorMessage('additional event purchases') : null,
      guestsError: guestsResult.error ? countErrorMessage('guest usage') : null,
      loading: false,
    });
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
  // If paid add-ons cannot be verified, enforce the included-plan cap rather
  // than failing open and allowing an unverified extra event.
  const atCap = counts.additionalEventsError
    ? currentEvents >= includedEvents
    : currentEvents >= totalAllowed;

  return {
    loading: planLoading || counts.loading,
    eventsError: counts.eventsError,
    additionalEventsError: counts.additionalEventsError,
    guestsError: counts.guestsError,
    includedEvents,
    additionalPurchased,
    totalAllowed,
    currentEvents,
    totalGuests: counts.guests,
    remaining,
    atCap,
    refresh: fetchCounts,
  };
};
