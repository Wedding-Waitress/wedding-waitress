import { supabase } from '@/integrations/supabase/client';

export class GuestCapacityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GuestCapacityError';
  }
}

export interface EventGuestLimitValidation {
  maximumGuestLimit: number | null;
  existingGuestCount: number;
  tableSeatCapacity: number;
  minimumGuestLimit: number;
  isPlatformOwner: boolean;
}

export const getCurrentPlanGuestLimit = async (): Promise<number | null> => {
  const { data: ownerAccess, error: ownerError } = await supabase.rpc('has_platform_owner_access');
  if (ownerError) throw ownerError;
  if (ownerAccess === true) return null;

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new GuestCapacityError('You must be signed in to set an event guest limit.');

  const { data, error } = await supabase.rpc('get_user_plan', { _user_id: user.id });
  if (error) throw error;
  const limit = Number(data?.[0]?.guest_limit);
  if (!Number.isFinite(limit) || limit < 1) {
    throw new GuestCapacityError('A current plan with a guest allowance is required.');
  }
  return limit;
};

const getEventUsage = async (eventId: string) => {
  const [guestResult, tableResult] = await Promise.all([
    supabase.from('guests').select('id', { count: 'exact', head: true }).eq('event_id', eventId),
    supabase.from('tables').select('limit_seats').eq('event_id', eventId),
  ]);
  if (guestResult.error) throw guestResult.error;
  if (tableResult.error) throw tableResult.error;
  const existingGuestCount = guestResult.count ?? 0;
  const tableSeatCapacity = (tableResult.data ?? []).reduce(
    (total, table) => total + Number(table.limit_seats || 0),
    0,
  );
  return { existingGuestCount, tableSeatCapacity };
};

const getPurchasedGuestCapacity = async (eventId: string): Promise<number> => {
  const { data, error } = await supabase
    .from('rsvp_invite_purchases')
    .select('overage_blocks')
    .eq('event_id', eventId)
    .eq('status', 'completed')
    .in('purchase_type', ['rsvp_overage', 'guest_capacity_topup']);
  if (error) throw error;
  return (data ?? []).reduce((total, purchase) => total + Number(purchase.overage_blocks || 0) * 10, 0);
};

export const getEventGuestLimitValidation = async (eventId: string): Promise<EventGuestLimitValidation> => {
  const { data, error } = await (supabase.rpc as any)('get_event_guest_capacity', { p_event_id: eventId });
  if (!error) {
    if (data?.is_platform_owner === true) {
      return {
        maximumGuestLimit: null,
        existingGuestCount: Number(data?.existing_guest_count || 0),
        tableSeatCapacity: Number(data?.table_seat_capacity || 0),
        minimumGuestLimit: 0,
        isPlatformOwner: true,
      };
    }
    const maximumGuestLimit = Number(data?.total_guest_limit);
    if (!Number.isFinite(maximumGuestLimit) || maximumGuestLimit < 1) {
      throw new GuestCapacityError('A current plan with a guest allowance is required.');
    }
    const usage = data?.existing_guest_count == null || data?.table_seat_capacity == null
      ? await getEventUsage(eventId)
      : {
          existingGuestCount: Number(data.existing_guest_count),
          tableSeatCapacity: Number(data.table_seat_capacity),
        };
    return {
      maximumGuestLimit,
      ...usage,
      minimumGuestLimit: Math.max(usage.existingGuestCount, usage.tableSeatCapacity),
      isPlatformOwner: false,
    };
  }

  // Compatibility during a staged rollout: older projects do not have the new
  // capacity RPC yet. Continue to validate from the existing protected plan and
  // event tables instead of preventing every event update with PGRST202.
  if (error.code !== 'PGRST202') throw error;
  const baseGuestLimit = await getCurrentPlanGuestLimit();
  if (baseGuestLimit == null) {
    return {
      maximumGuestLimit: null,
      existingGuestCount: 0,
      tableSeatCapacity: 0,
      minimumGuestLimit: 0,
      isPlatformOwner: true,
    };
  }
  const [usage, purchasedGuestCapacity] = await Promise.all([
    getEventUsage(eventId),
    getPurchasedGuestCapacity(eventId),
  ]);
  return {
    maximumGuestLimit: baseGuestLimit + purchasedGuestCapacity,
    ...usage,
    minimumGuestLimit: Math.max(usage.existingGuestCount, usage.tableSeatCapacity),
    isPlatformOwner: false,
  };
};

export const assertGuestLimitsWithinEntitlement = (
  maximum: number | null,
  guestLimit?: number | null,
  ceremonyGuestLimit?: number | null,
) => {
  if (maximum == null) return;
  const requested = [guestLimit, ceremonyGuestLimit].filter((value): value is number => value != null);
  if (requested.some((value) => value < 1 || value > maximum)) {
    throw new GuestCapacityError(`Your current plan allows up to ${maximum} guests for this event.`);
  }
};

export const assertEventGuestLimitChange = (
  validation: EventGuestLimitValidation,
  guestLimit?: number | null,
  ceremonyGuestLimit?: number | null,
) => {
  if (validation.isPlatformOwner) return;
  assertGuestLimitsWithinEntitlement(validation.maximumGuestLimit, guestLimit, ceremonyGuestLimit);
  if (guestLimit != null && guestLimit < validation.minimumGuestLimit) {
    throw new GuestCapacityError(
      `This event currently has ${validation.existingGuestCount} guests and ${validation.tableSeatCapacity} table seats. `
      + `The guest limit must be at least ${validation.minimumGuestLimit}.`,
    );
  }
};

export const getGuestCapacityMutationError = (error: unknown): GuestCapacityError | null => {
  const candidate = error as { message?: string; details?: string } | null;
  const combined = `${candidate?.message || ''} ${candidate?.details || ''}`;
  if (!/WW_(EVENT_GUEST_LIMIT_EXCEEDED|EVENT_LIMIT_BELOW_GUEST_COUNT|EVENT_LIMIT_BELOW_TABLE_CAPACITY|GUEST_PLAN_INACTIVE)/.test(combined)) {
    return null;
  }
  const detail = candidate?.details?.trim();
  if (detail) return new GuestCapacityError(detail);
  if (combined.includes('WW_EVENT_LIMIT_BELOW_GUEST_COUNT')) {
    return new GuestCapacityError('The guest limit cannot be lower than the number of existing guests.');
  }
  if (combined.includes('WW_EVENT_LIMIT_BELOW_TABLE_CAPACITY')) {
    return new GuestCapacityError('The guest limit cannot be lower than the combined table seating capacity.');
  }
  if (combined.includes('WW_EVENT_GUEST_LIMIT_EXCEEDED')) {
    return new GuestCapacityError('The requested guest limit exceeds the current plan allowance.');
  }
  return new GuestCapacityError('A current plan with a guest allowance is required.');
};
