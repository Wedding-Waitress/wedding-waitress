import { describe, expect, it } from 'vitest';
import { getAnalyticsPagePath } from './analyticsPath';

describe('getAnalyticsPagePath', () => {
  it('removes authentication and invitation secrets from page views', () => {
    expect(getAnalyticsPagePath(
      '/accept-team-invitation',
      '?token=secret&code=auth-code&utm_source=email',
    )).toBe('/accept-team-invitation?utm_source=email');
  });

  it('preserves ordinary route state', () => {
    expect(getAnalyticsPagePath('/dashboard', '?tab=guest-list&event=qa')).toBe('/dashboard?tab=guest-list&event=qa');
  });
});
