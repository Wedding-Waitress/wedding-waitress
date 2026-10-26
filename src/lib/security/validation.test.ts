import { describe, expect, it } from 'vitest';
import { secureGuestSchema } from './validation';
import { zodResolver } from '@hookform/resolvers/zod';

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

  it('preserves the RSVP validation message', () => {
    const result = secureGuestSchema.safeParse({ ...validGuest, rsvp: 'invalid' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].message).toBe('Invalid RSVP status');
  });

  it('keeps form resolver errors and transformed guest defaults compatible', async () => {
    const resolve = zodResolver(secureGuestSchema);
    const options = { fields: {}, shouldUseNativeValidation: false };
    const invalid = await resolve({ ...validGuest, seat_no: undefined }, {}, options);
    expect(invalid.errors.seat_no?.message).toBe('Seat selection is required');
    const valid = await resolve({ ...validGuest, dietary: undefined }, {}, options);
    expect(valid.errors).toEqual({});
    expect(valid.values).toMatchObject({ seat_no: 1, dietary: 'NA' });
  });

  it('rejects an oversized collection supplied as a scalar without per-element errors', () => {
    const result = secureGuestSchema.safeParse({ ...validGuest, first_name: Array(100000).fill('x') });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues.length).toBeLessThanOrEqual(2);
  });
});
