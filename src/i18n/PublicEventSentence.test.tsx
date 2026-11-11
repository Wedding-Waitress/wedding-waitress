import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { createInstance } from 'i18next';
import { I18nextProvider } from 'react-i18next';
import { afterEach, expect, it } from 'vitest';
import { PublicEventSentence } from './PublicEventSentence';
import { publicEventSentenceRows, publicEventSentenceSources } from './publicEventSentenceCopy';
import { publicNavigationRows } from './publicNavigationCopy';
afterEach(cleanup);
it.each(['en','it','ar','zh','vi','hi','tr','de','es','fr','nl','ja','el'])('renders complete event headings in %s', async language => {
  const instance = createInstance();
  await instance.init({ lng: language, resources: {}, initImmediate: false });
  expect(publicEventSentenceRows[language]).toHaveLength(3);
  render(<I18nextProvider i18n={instance}>{([0,1,2] as const).map(kind => <span key={kind} data-testid={`sentence-${kind}`}><PublicEventSentence kind={kind} eventName="weddings">{publicEventSentenceSources[kind].replace('{{event}}','weddings')}</PublicEventSentence></span>)}</I18nextProvider>);
  for (const kind of [0,1,2]) {
    const expected = publicEventSentenceRows[language][kind].replace('{{event}}', language === 'en' ? 'weddings' : publicNavigationRows[language][15]);
    expect(screen.getByTestId(`sentence-${kind}`).textContent).toBe(expected);
    expect(expected).not.toContain('{{event}}');
  }
});
it('escapes inserted text rather than interpreting markup', async () => {
  const instance = createInstance();
  await instance.init({ lng: 'it', resources: {}, initImmediate: false });
  const { container } = render(<I18nextProvider i18n={instance}><PublicEventSentence kind={1} eventName="<img src=x>" >fallback</PublicEventSentence></I18nextProvider>);
  expect(container.textContent).toContain('<img src=x>');
  expect(container.querySelector('img')).toBeNull();
});
