import { describe, expect, it } from 'vitest';
import {
  createSignInRedirectState,
  getSafeAuthenticatedReturnTo,
  readSignInRedirectState,
} from './authNavigation';

describe('authenticated navigation', () => {
  it.each([
    '/dashboard',
    '/dashboard?tab=guest-list',
    '/dashboard/photo-video-gallery/gallery-view',
    '/account',
    '/account/plans-upgrades',
    '/account#billing',
    '/admin/overview',
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
