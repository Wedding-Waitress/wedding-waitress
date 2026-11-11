import { describe, expect, it } from 'vitest';
import {
  assertEventGuestLimitChange,
  getGuestCapacityMutationError,
  GuestCapacityError,
  type EventGuestLimitValidation,
} from './guestCapacityAccess';

const ordinaryValidation: EventGuestLimitValidation = {
  maximumGuestLimit: 100,
  existingGuestCount: 0,
  tableSeatCapacity: 92,
  minimumGuestLimit: 92,
  isPlatformOwner: false,
};

describe('event guest-limit validation', () => {
  it('allows 110 to be reduced to 100 when 92 table seats are configured', () => {
    expect(() => assertEventGuestLimitChange(ordinaryValidation, 100)).not.toThrow();
  });

  it('reports the exact minimum when the requested limit is below guests or seats', () => {
    expect(() => assertEventGuestLimitChange(ordinaryValidation, 91)).toThrow(
      'This event currently has 0 guests and 92 table seats. The guest limit must be at least 92.',
    );
  });

  it('uses the greater of existing guests and table seats as the minimum', () => {
    expect(() => assertEventGuestLimitChange({
      ...ordinaryValidation,
      existingGuestCount: 96,
      minimumGuestLimit: 96,
    }, 95)).toThrow('The guest limit must be at least 96.');
  });

  it('preserves the Platform Owner bypass', () => {
    expect(() => assertEventGuestLimitChange({
      maximumGuestLimit: null,
      existingGuestCount: 500,
      tableSeatCapacity: 500,
      minimumGuestLimit: 500,
      isPlatformOwner: true,
    }, 1)).not.toThrow();
  });

  it('converts database validation details into a user-facing reason', () => {
    const result = getGuestCapacityMutationError({
      message: 'WW_EVENT_LIMIT_BELOW_TABLE_CAPACITY',
      details: 'The event already has 92 table seats.',
    });
    expect(result).toBeInstanceOf(GuestCapacityError);
    expect(result?.message).toBe('The event already has 92 table seats.');
  });
});
