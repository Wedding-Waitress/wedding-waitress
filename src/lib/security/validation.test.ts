import { describe, expect, it } from 'vitest';
import { secureGuestSchema } from './validation';

const validGuest = {
  first_name: 'Browser',
  last_name: 'Tester',
  table_id: 'table-1',
  seat_no: 1,
  rsvp: 'Pending' as const,
  dietary: 'NA',
};

describe('secureGuestSchema', () => {
  it('shows a customer-facing required message when no seat is selected', () => {
    const result = secureGuestSchema.safeParse({ ...validGuest, seat_no: undefined });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.seat_no).toEqual(['Seat selection is required']);
    }
  });

  it('accepts a selected seat number', () => {
    expect(secureGuestSchema.safeParse(validGuest).success).toBe(true);
  });
});
