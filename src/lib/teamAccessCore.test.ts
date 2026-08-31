import { describe, expect, it } from 'vitest';
import {
  isTeamAction, isValidEmail, normalizeEmail, publicErrorMessage, resolveSeatLimit, safeRedirectOrigin,
} from '../../supabase/functions/manage-account-members/core';

describe('manage-account-members validation', () => {
  it('normalizes and validates account invitation emails', () => {
    expect(normalizeEmail(' Team.Member@Example.COM ')).toBe('team.member@example.com');
    expect(isValidEmail('team.member@example.com')).toBe(true);
    expect(isValidEmail('not-an-email')).toBe(false);
  });

  it('accepts only the supported action allowlist', () => {
    expect(isTeamAction('invite')).toBe(true);
    expect(isTeamAction('accept')).toBe(true);
    expect(isTeamAction('promote-to-master')).toBe(false);
  });

  it('does not permit insecure redirect origins or raw backend errors', () => {
    expect(safeRedirectOrigin(undefined)).toBeNull();
    expect(safeRedirectOrigin('http://unsafe.example')).toBeNull();
    expect(safeRedirectOrigin('https://weddingwaitress.com.au/path')).toBe('https://weddingwaitress.com.au');
    expect(publicErrorMessage('database connection details')).toBe('The team access request could not be completed');
    expect(publicErrorMessage('error: All account seats are currently occupied or reserved')).toContain('account seats');
  });

  it('derives account seats from the product plan', () => {
    expect(resolveSeatLimit({ name: 'Essential', max_users: 99 })).toBe(3);
    expect(resolveSeatLimit({ name: 'Premium', max_users: 99 })).toBe(3);
    expect(resolveSeatLimit({ name: 'Unlimited', max_users: 99 })).toBe(3);
    expect(resolveSeatLimit({ name: 'Vendor Pro', max_users: 3 })).toBe(10);
    expect(resolveSeatLimit(null)).toBe(3);
  });
});
