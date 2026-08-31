import { supabase } from '@/integrations/supabase/client';

export const EVENT_ALLOWANCE_CHANGED_EVENT = 'ww:event-allowance-changed';

export type EventPlanKey = 'free' | 'essential' | 'premium' | 'unlimited' | 'vendor_pro';

export interface EventAllowanceSnapshot {
  planKey: EventPlanKey;
  includedEvents: number;
  paidAdditionalEvents: number;
  totalAllowed: number;
  activeEvents: number;
  remaining: number;
  atCap: boolean;
  canPurchaseAdditionalEvents: boolean;
  canCreate: boolean;
}

interface EventAllowanceRow {
  plan_key: EventPlanKey;
  included_events: number;
  paid_additional_events: number;
  total_allowed: number;
  active_events: number;
  remaining: number;
  at_cap: boolean;
  can_purchase_additional_events: boolean;
  can_create: boolean;
}

export class EventAllowanceError extends Error {
  constructor(
    public readonly reason: 'limit-reached' | 'plan-inactive' | 'unavailable',
    message: string,
  ) {
    super(message);
    this.name = 'EventAllowanceError';
  }
}

const parseRow = (row: EventAllowanceRow): EventAllowanceSnapshot => ({
  planKey: row.plan_key,
  includedEvents: row.included_events,
  paidAdditionalEvents: row.paid_additional_events,
  totalAllowed: row.total_allowed,
  activeEvents: row.active_events,
  remaining: row.remaining,
  atCap: row.at_cap,
  canPurchaseAdditionalEvents: row.can_purchase_additional_events,
  canCreate: row.can_create,
});

export const getEventAllowanceSnapshot = async (): Promise<EventAllowanceSnapshot> => {
  const { data, error } = await supabase.rpc('get_my_event_allowance');
  if (error) {
    throw new EventAllowanceError('unavailable', 'Unable to verify the event allowance. Please try again.');
  }

  const row = (Array.isArray(data) ? data[0] : data) as EventAllowanceRow | null;
  if (!row) {
    throw new EventAllowanceError('unavailable', 'Unable to verify the event allowance. Please sign in again.');
  }
  return parseRow(row);
};

export const getEventCreationBlockMessage = (allowance: EventAllowanceSnapshot): string => {
  if (!allowance.canCreate) {
    return 'Your plan is not active for event creation. Please review your subscription.';
  }
  if (allowance.planKey === 'vendor_pro') {
    return 'Vendor Pro supports up to 100 active events. Delete or wait for an active event to expire before creating another.';
  }
  if (allowance.canPurchaseAdditionalEvents) {
    return 'Your included event is already in use. Purchase an additional event to create another.';
  }
  return 'Your free account includes 1 active event. Delete or wait for it to expire before creating another.';
};

export const getDatabaseEventCreationError = (error: unknown): EventAllowanceError | null => {
  const message = typeof error === 'object' && error && 'message' in error
    ? String((error as { message?: unknown }).message)
    : String(error ?? '');
  if (message.includes('WW_EVENT_LIMIT_REACHED')) {
    return new EventAllowanceError('limit-reached', 'Your active-event allowance has been reached.');
  }
  if (message.includes('WW_EVENT_PLAN_INACTIVE')) {
    return new EventAllowanceError('plan-inactive', 'Your plan is not active for event creation.');
  }
  return null;
};

export const notifyEventAllowanceChanged = () => {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(EVENT_ALLOWANCE_CHANGED_EVENT));
};
