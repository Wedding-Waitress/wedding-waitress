import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { createInstance } from 'i18next';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CookieBanner } from './CookieBanner';
import { publicCookieConsentRows, publicCookieConsentSources } from '@/i18n/publicCookieConsentCopy';

beforeEach(() => { localStorage.clear(); vi.useFakeTimers(); });
afterEach(() => { cleanup(); vi.useRealTimers(); localStorage.clear(); });
async function show(language: string) {
  const instance = createInstance();
  await instance.init({ lng: language, resources: {}, initImmediate: false });
  render(<I18nextProvider i18n={instance}><MemoryRouter><CookieBanner /></MemoryRouter></I18nextProvider>);
  act(() => vi.advanceTimersByTime(1000));
}
describe('public cookie consent language and preserved behaviour', () => {
  it.each(['en','it','ar','zh','vi','hi','tr','de','es','fr','nl','ja','el'])('translates banner and preference controls in %s', async language => {
    const row = publicCookieConsentRows[language];
    expect(row).toHaveLength(publicCookieConsentSources.length);
    await show(language);
    expect(screen.getByText(row[0])).toBeInTheDocument();
    expect(screen.getByText(row[1], { exact: false })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: row[3] })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: row[2] }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    for (const index of [4,5,6,7,8,9,10,11]) expect(screen.getByText(row[index])).toBeInTheDocument();
    expect(screen.getByRole('button', { name: row[12] })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: row[13] })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: row[14] })).toBeInTheDocument();
    expect(screen.getAllByRole('switch')[0]).toBeDisabled();
    expect(localStorage.getItem('cookie_consent')).toBeNull();
  });
  it('preserves essential-only rejection while translated', async () => {
    await show('ar');
    const row = publicCookieConsentRows.ar;
    fireEvent.click(screen.getByRole('button', { name: row[2] }));
    fireEvent.click(screen.getByRole('button', { name: row[12] }));
    expect(JSON.parse(localStorage.getItem('cookie_consent')!)).toMatchObject({ mode: 'essential', necessary: true, analytics: false, marketing: false });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
