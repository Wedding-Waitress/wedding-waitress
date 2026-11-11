import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TOPUP_CHECKING, TOPUP_PLAN_REQUIRED, isCommunicationTopupSubscriptionCurrent, type TopupEligibility } from '@/lib/communicationTopupEligibility';

// Read the actual purchase entitlement, not the display plan (which may include owner privileges).
export async function readCommunicationTopupEligibility(eventId: string): Promise<TopupEligibility> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!user) return { status: 'ineligible', message: 'Sign in to purchase communication credits.' };
  const [event, subscription] = await Promise.all([
    supabase.from('events').select('id').eq('id', eventId).eq('user_id', user.id).maybeSingle(),
    supabase.from('user_subscriptions').select('plan_id, status, expires_at, is_read_only').eq('user_id', user.id)
      .in('status', ['active', 'trialing', 'grace_period']).order('created_at', { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (event.error) throw event.error;
  if (subscription.error) throw subscription.error;
  if (!event.data) return { status: 'ineligible', message: 'Only the event owner can purchase communication credits.' };
  return isCommunicationTopupSubscriptionCurrent(subscription.data)
    ? { status: 'eligible', message: '' }
    : { status: 'ineligible', message: TOPUP_PLAN_REQUIRED };
}

export function useCommunicationTopupEligibility(eventId: string | null | undefined) {
  const version = useRef(0);
  const [state, setState] = useState<{eventId: typeof eventId; value: TopupEligibility}>({ eventId, value: TOPUP_CHECKING });
  const refresh = useCallback(async () => {
    const request = ++version.current;
    setState({ eventId, value: TOPUP_CHECKING });
    let value: TopupEligibility;
    let deadline: number | undefined;
    try {
      const read = eventId ? readCommunicationTopupEligibility(eventId) : Promise.resolve<TopupEligibility>( { status: 'ineligible', message: 'Select an event first.' });
      value = await Promise.race([read, new Promise<never>((_, reject) => { deadline = window.setTimeout(() => reject(new Error('Eligibility timed out')), 15_000); })]);
    } catch {
      value = { status: 'error', message: 'Credit purchase eligibility could not be checked. Please retry.' };
    }
    window.clearTimeout(deadline);
    if (request !== version.current) return null;
    setState({ eventId, value });
    return value;
  }, [eventId]);
  const deny = useCallback((message: string) => {
    ++version.current;
    setState({ eventId, value: { status: 'ineligible', message } });
  }, [eventId]);
  useEffect(() => {
    let alive = true;
    void refresh();
    const onFocus = () => { if (alive) void refresh(); };
    window.addEventListener('focus', onFocus);
    const interval = window.setInterval(onFocus, 60_000);
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      if (!alive) return;
      ++version.current;
      setState({ eventId, value: TOPUP_CHECKING });
      // Supabase auth callbacks must not await another auth request.
      window.setTimeout(onFocus, 0);
    });
    return () => { alive = false; ++version.current; window.removeEventListener('focus', onFocus); window.clearInterval(interval); subscription.unsubscribe(); };
  }, [eventId, refresh]);
  return { getVersion: () => version.current, eligibility: state.eventId === eventId ? state.value : TOPUP_CHECKING, refresh, deny };
}
