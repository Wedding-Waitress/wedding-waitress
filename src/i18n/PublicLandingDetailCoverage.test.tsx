import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { createInstance } from 'i18next';
import { I18nextProvider } from 'react-i18next';
import { afterEach, expect, it } from 'vitest';
import { PublicCopy } from './PublicCopy';
import { publicLandingDetailRows, publicLandingDetailSources } from './publicLandingDetailCopy';

afterEach(cleanup);
it.each(['en','it','ar','zh','vi','hi','tr','de','es','fr','nl','ja','el'])('renders homepage detail copy in %s without requiring resource fallbacks', async language => {
  const instance = createInstance();
  await instance.init({ lng: language, resources: {}, initImmediate: false });
  expect(publicLandingDetailRows[language]).toHaveLength(publicLandingDetailSources.length);
  render(<I18nextProvider i18n={instance}>{publicLandingDetailSources.map((text, index) => <span key={text} data-testid={`detail-${index}`}><PublicCopy text={text} /></span>)}</I18nextProvider>);
  publicLandingDetailSources.forEach((source, index) => {
    expect(screen.getByTestId(`detail-${index}`).textContent).toBe(publicLandingDetailRows[language][index]);
    if (language !== 'en') expect(publicLandingDetailRows[language][index]).not.toBe(source);
  });
});
it('preserves spacing around the homepage link label', async () => {
  const instance = createInstance();
  await instance.init({ lng: 'zh', resources: {}, initImmediate: false });
  render(<I18nextProvider i18n={instance}><span data-testid="link"><PublicCopy text="Explore All Products " /></span></I18nextProvider>);
  expect(screen.getByTestId('link').textContent).toBe('探索所有产品 ');
});
