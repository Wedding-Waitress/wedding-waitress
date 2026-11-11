import { describe, expect, it } from 'vitest';
import {
  createSignInRedirectState,
  getSafeAuthenticatedReturnTo,
  readSignInRedirectState,
  getAccountEntryDestination,
} from './authNavigation';

describe('authenticated navigation', () => {
  it.each([undefined, '/dashboard', '/dashboard?tab=dashboard', '/dashboard?tab=event-budget', '/dashboard/photo-video-gallery/gallery-view', '//example.com'])
    ('starts dashboard account entry at My Events for %s', destination => {
      expect(getAccountEntryDestination(destination)).toBe('/dashboard?tab=my-events');
    });

  it.each(['/account/plan-billing', '/admin/overview'])('preserves separate protected flow %s', destination => {
    expect(getAccountEntryDestination(destination)).toBe(destination);
  });
  it.each([
    '/dashboard',
    '/dashboard?tab=guest-list',
    '/dashboard/photo-video-gallery/gallery-view',
    '/account',
    '/account/plan-billing',
    '/account#billing',
    '/admin/overview',
    '/accept-team-invitation',
  ])('allows the protected destination %s', (destination) => {
    expect(getSafeAuthenticatedReturnTo(destination)).toBe(destination);
  });

  it.each(['https://example.com', '//example.com', '/', '/products', '/administrator'])
    ('rejects the unsafe or public destination %s', (destination) => {
      expect(getSafeAuthenticatedReturnTo(destination)).toBe('/dashboard');
    });

  it('creates and reads a protected sign-in redirect state', () => {
    const state = createSignInRedirectState('/account/profile');
    expect(readSignInRedirectState(state)).toBe('/account/profile');
  });
});
