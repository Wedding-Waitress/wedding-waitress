import { describe, expect, it } from 'vitest';
import { createPath, resolvePath } from 'react-router-dom';
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
    '/account/plan-billing',
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

  it.each([
    '/dashboard/../../\\example.invalid',
    '/dashboard/..//example.invalid',
    '/dashboard/%2f%2fexample.invalid',
    '/account/%5c%5cexample.invalid',
    '/dashboard/\u0000invalid',
  ])('keeps malformed return path %s on the application origin after router resolution', (destination) => {
    const guarded = getSafeAuthenticatedReturnTo(destination);
    expect(guarded).toBe('/dashboard');
    const resolved = createPath(resolvePath(guarded, '/'));
    expect(new URL(resolved, 'https://weddingwaitress.com.au').origin).toBe('https://weddingwaitress.com.au');
  });

  it('normalizes the path before allowing a protected destination', () => {
    expect(getSafeAuthenticatedReturnTo('/dashboard/../account/profile?tab=billing#details')).toBe('/account/profile?tab=billing#details');
  });
});
