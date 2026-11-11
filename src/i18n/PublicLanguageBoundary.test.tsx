import React from 'react';
import { act, render, screen, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { afterEach, describe, expect, it } from 'vitest';
import publicI18n from './config';
import { PublicLanguageBoundary } from './PublicLanguageBoundary';
import { isPublicLanguageRoute } from './publicLanguageRoutes';

function Probe() {
  const { t, i18n } = useTranslation('common');
  return <p data-testid="language">{i18n.language}:{t('email')}</p>;
}
afterEach(async () => { cleanup(); await publicI18n.changeLanguage('en'); document.documentElement.dir = 'ltr'; });

describe('public-only language preference', () => {
  it.each(['/','/pricing','/blog/a-post','/events/weddings','/products/guest-list','/privacy','/individual-table-charts','/s/test-wedding','/s/test-wedding/video-wishes'])('includes marketing route %s', path => {
    expect(isPublicLanguageRoute(path)).toBe(true);
  });
  it.each(['/dashboard','/dashboard/photos','/admin/customers','/account','/gallery/token','/shared-running-sheet/token','/account-recovery','/account-renewal-checkout'])('excludes customer/admin/guest route %s', path => {
    expect(isPublicLanguageRoute(path)).toBe(false);
  });
  it.each(['/pricing','/s/test-wedding'])('uses Arabic and RTL on the public route %s', async (route) => {
    await publicI18n.changeLanguage('ar');
    render(<MemoryRouter initialEntries={[route]}><PublicLanguageBoundary><Probe /></PublicLanguageBoundary></MemoryRouter>);
    expect(screen.getByTestId('language').textContent).toMatch(/^ar:/);
    await waitFor(() => expect(document.documentElement.dir).toBe('rtl'));
  });
  it('keeps dashboards English/LTR without erasing the saved Arabic preference', async () => {
    await publicI18n.changeLanguage('ar');
    render(<MemoryRouter initialEntries={['/dashboard']}><PublicLanguageBoundary><Probe /></PublicLanguageBoundary></MemoryRouter>);
    expect(screen.getByTestId('language')).toHaveTextContent('en:Email');
    expect(document.documentElement.dir).toBe('ltr');
    expect(publicI18n.language).toBe('ar');
    await act(async () => { await publicI18n.changeLanguage('it'); });
    expect(screen.getByTestId('language')).toHaveTextContent('en:Email');
    expect(document.documentElement.lang).toBe('en');
  });
});
