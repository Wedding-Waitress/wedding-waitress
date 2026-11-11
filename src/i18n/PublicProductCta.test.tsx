import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { createInstance } from 'i18next';
import { I18nextProvider } from 'react-i18next';
import { afterEach, describe, expect, it } from 'vitest';
import { PublicProductCta } from './PublicProductCta';
import { publicProductCtaRows } from './publicProductCtaCopy';
import { publicNavigationRows, publicNavigationSources } from './publicNavigationCopy';
afterEach(cleanup);
describe('complete product CTA sentences', () => {
  it.each(['en','it','ar','zh','vi','hi','tr','de','es','fr','nl','ja','el'])('keeps product placement grammatical in %s', async language => {
    const instance = createInstance();
    await instance.init({ lng: language, resources: {}, initImmediate: false });
    render(<I18nextProvider i18n={instance}><h2 data-testid="cta"><PublicProductCta productName="tables">Start planning tables in one connected place</PublicProductCta></h2></I18nextProvider>);
    const product = language === 'en' ? 'tables' : publicNavigationRows[language][publicNavigationSources.indexOf('Tables')];
    expect(screen.getByTestId('cta').textContent).toBe(publicProductCtaRows[language][0].replace('{{product}}', product));
    expect(screen.getByTestId('cta').children).toHaveLength(0);
  });
  it('escapes substituted text instead of injecting HTML', async () => {
    const instance = createInstance();
    await instance.init({ lng: 'ar', resources: {}, initImmediate: false });
    render(<I18nextProvider i18n={instance}><p data-testid="cta"><PublicProductCta productName="<img src=x>" >English fallback</PublicProductCta></p></I18nextProvider>);
    expect(screen.getByTestId('cta').textContent).toContain('<img src=x>');
    expect(screen.getByTestId('cta').querySelector('img')).toBeNull();
  });
});
