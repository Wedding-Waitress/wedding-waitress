import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { EVENT_DELETED_EVENT } from '@/lib/eventDeletion';
import {
  EVENT_ALLOWANCE_CHANGED_EVENT,
  getEventAllowanceSnapshot,
  type EventPlanKey,
} from '@/lib/eventAllowance';

export interface EventLimitsState {
  loading: boolean;
  eventsError: string | null;
  additionalEventsError: string | null;
  guestsError: string | null;
  planKey: EventPlanKey;
  includedEvents: number;
  additionalPurchased: number;
  totalAllowed: number;
  currentEvents: number;
  totalGuests: number;
  remaining: number;
  atCap: boolean;
  canPurchaseAdditionalEvents: boolean;
  canCreate: boolean;
  refresh: () => void;
}

const initialState: Omit<EventLimitsState, 'refresh'> = {
  loading: true,
  eventsError: null,
  additionalEventsError: null,
  guestsError: null,
  planKey: 'free',
  includedEvents: 1,
  additionalPurchased: 0,
  totalAllowed: 1,
  currentEvents: 0,
  totalGuests: 0,
  remaining: 0,
  atCap: true,
  canPurchaseAdditionalEvents: false,
  canCreate: false,
};

const usageError = (label: string) => `Unable to load ${label}.`;

export const useEventLimits = (): EventLimitsState => {
  const [state, setState] = useState(initialState);

  const fetchCounts = useCallback(async () => {
    setState((current) => ({ ...current, loading: true }));
    try {
      const allowance = await getEventAllowanceSnapshot();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setState({ ...initialState, loading: false });
        return;
      }

      const { data: membership } = await supabase
        .from('account_members' as any)
        .select('account_owner_id')
        .eq('member_user_id', user.id)
        .is('access_disabled_at', null)
        .order('invited_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      const ownerId = (membership as { account_owner_id?: string } | null)?.account_owner_id ?? user.id;
      const eventsResult = await supabase
        .from('events')
        .select('id')
        .eq('user_id', ownerId);
      const eventIds = (eventsResult.data ?? []).map(({ id }) => id);
      const guestsResult = eventsResult.error
        ? { count: null, error: eventsResult.error }
        : eventIds.length === 0
          ? { count: 0, error: null }
          : await supabase.from('guests').select('id', { count: 'exact', head: true }).in('event_id', eventIds);

      setState({
        loading: false,
        eventsError: null,
        additionalEventsError: null,
        guestsError: guestsResult.error ? usageError('guest usage') : null,
        planKey: allowance.planKey,
        includedEvents: allowance.includedEvents,
        additionalPurchased: allowance.paidAdditionalEvents,
        totalAllowed: allowance.totalAllowed,
        currentEvents: allowance.activeEvents,
        totalGuests: guestsResult.count ?? 0,
        remaining: allowance.remaining,
        atCap: allowance.atCap || !allowance.canCreate,
        canPurchaseAdditionalEvents: allowance.canPurchaseAdditionalEvents,
        canCreate: allowance.canCreate,
      });
    } catch (error) {
      console.error('Unable to load the authoritative event allowance:', error);
      setState((current) => ({
        ...current,
        loading: false,
        eventsError: usageError('event usage'),
        additionalEventsError: usageError('additional event purchases'),
        atCap: true,
        canCreate: false,
      }));
    }
  }, []);

  useEffect(() => { void fetchCounts(); }, [fetchCounts]);

  useEffect(() => {
    const refresh = () => { void fetchCounts(); };
    window.addEventListener(EVENT_DELETED_EVENT, refresh);
    window.addEventListener(EVENT_ALLOWANCE_CHANGED_EVENT, refresh);
    return () => {
      window.removeEventListener(EVENT_DELETED_EVENT, refresh);
      window.removeEventListener(EVENT_ALLOWANCE_CHANGED_EVENT, refresh);
    };
  }, [fetchCounts]);

  return { ...state, refresh: () => { void fetchCounts(); } };
};
