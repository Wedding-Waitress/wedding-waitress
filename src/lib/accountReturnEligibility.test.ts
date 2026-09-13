import { describe, expect, it } from 'vitest';
import { validateAccountReturnEligibility } from './accountReturnEligibility';

const decision = (server_now: string, paid_until: string | null, can_reopen = true) => ({
  account_closed: true, admin_blocked: false, server_now, paid_until,
  can_reopen, renewal_required: !can_reopen,
});

describe('closed-account server entitlement decision', () => {
  it('accepts only the server-verified original remaining trial, never a paid-name alias', () => {
    const trial = { ...decision('2026-09-12T00:00:00Z', null), entitlement_kind: 'trial', entitlement_until: '2026-09-14T00:00:00Z' };
    expect(validateAccountReturnEligibility(trial)?.can_reopen).toBe(true);
    expect(validateAccountReturnEligibility({ ...trial, entitlement_until: trial.server_now })).toBeNull();
    expect(validateAccountReturnEligibility({ ...trial, paid_until: trial.entitlement_until })).toBeNull();
    expect(validateAccountReturnEligibility({ ...trial, entitlement_kind: 'paid' })).toBeNull();
    expect(validateAccountReturnEligibility({ ...trial, entitlement_until: 'infinity' })).toBeNull();
  });
  it('preserves the original expiry on return, not a new twelve-month term', () => {
    const result = validateAccountReturnEligibility(decision('2026-08-09T00:00:00Z', '2027-01-09T00:00:00Z'));
    expect(result?.paid_until).toBe('2027-01-09T00:00:00Z');
    expect(result?.can_reopen).toBe(true);
  });
  it('requires renewal exactly at expiry and afterwards', () => {
    for (const now of ['2027-01-09T00:00:00Z', '2027-02-09T00:00:00Z']) {
      expect(validateAccountReturnEligibility(decision(now, '2027-01-09T00:00:00Z', false))?.renewal_required).toBe(true);
      expect(validateAccountReturnEligibility(decision(now, '2027-01-09T00:00:00Z'))).toBeNull();
    }
  });
  it('compares actual instants across timezone offsets, including the last millisecond', () => {
    expect(validateAccountReturnEligibility(decision('2027-01-09T10:59:59.999+11:00', '2027-01-09T00:00:00Z'))?.can_reopen).toBe(true);
    expect(validateAccountReturnEligibility(decision('2027-01-09T11:00:00+11:00', '2027-01-09T00:00:00Z'))).toBeNull();
  });
  it('rejects admin-hold bypass, free reopen without entitlement, and malformed decisions', () => {
    const valid = decision('2026-08-09T00:00:00Z', '2027-01-09T00:00:00Z');
    expect(validateAccountReturnEligibility({ ...valid, admin_blocked: true })).toBeNull();
    expect(validateAccountReturnEligibility({ ...valid, account_closed: false })).toBeNull();
    expect(validateAccountReturnEligibility({ ...valid, paid_until: null })).toBeNull();
    expect(validateAccountReturnEligibility({ ...valid, server_now: 'infinity' })).toBeNull();
    expect(validateAccountReturnEligibility({ ...valid, can_reopen: 'true' })).toBeNull();
  });
});
