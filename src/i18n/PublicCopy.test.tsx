import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createInstance } from 'i18next';
import { afterEach, describe, expect, it } from 'vitest';
import { PublicCopy } from './PublicCopy';
import { publicUiRows, publicUiSources } from './publicUiCopy';
import { publicPageRows, publicPageSources } from './publicPageCopy';
import { publicSectionRows, publicSectionSources } from './publicSectionCopy';
import { publicTrialRows, publicTrialSources } from './publicTrialCopy';
import { publicCookieRows, publicCookieSources } from './publicCookieCopy';
import { publicContactRows, publicContactSources } from './publicContactCopy';
import { publicProductHeroRows, publicProductHeroSources } from './publicProductHeroCopy';
import { publicWorkflowRows, publicWorkflowSources } from './publicWorkflowCopy';
import { publicNavigationRows, publicNavigationSources } from './publicNavigationCopy';
import { publicPlatformRows, publicPlatformSources } from './publicPlatformCopy';
import { publicPlanFaqRows, publicPlanFaqSources } from './publicPlanFaqCopy';
import { publicGeneralFaqRows, publicGeneralFaqSources } from './publicGeneralFaqCopy';
import { publicFeatureFaqRows, publicFeatureFaqSources } from './publicFeatureFaqCopy';
import { publicProductSectionRows, publicProductSectionSources } from './publicProductSectionCopy';
import { publicEventOverviewRows, publicEventOverviewSources } from './publicEventOverviewCopy';
import { publicFullNameRows, publicFullNameSources } from './publicFullNameCopy';
import { publicTableGuideRows, publicTableGuideSources } from './publicTableGuideCopy';
import { publicFaqMetadataRows, publicFaqMetadataSources } from './publicFaqMetadataCopy';
import { publicMediaGuideRows, publicMediaGuideSources } from './publicMediaGuideCopy';
import { publicMediaSectionLabelRows, publicMediaSectionLabelSources } from './publicMediaSectionLabelCopy';
import { publicMediaExperienceRows, publicMediaExperienceSources } from './publicMediaExperienceCopy';

afterEach(cleanup);
const languages = ['en','it','ar','zh','vi','hi','tr','de','es','fr','nl','ja','el'];
describe('current public copy catalogues', () => {
  it.each(languages)('renders the approved single recovery sentence without English fallback in %s', async language => {
    const text='Account recovery: 6 months free after expiry.';
    const index=publicUiSources.indexOf(text);
    expect(index).toBeGreaterThanOrEqual(0);
    const instance=createInstance();await instance.init({lng:language,resources:{},initImmediate:false});
    render(<I18nextProvider i18n={instance}><span data-testid="recovery-copy"><PublicCopy text={text}/></span></I18nextProvider>);
    const result=screen.getByTestId('recovery-copy').textContent;
    expect(result).toBe(publicUiRows[language][index]);expect(result).toContain('6');
    if(language!=='en')expect(result).not.toBe(text);
  });

  it.each(languages)('renders all five media experience sections and labels in %s', async language => {
    expect(publicMediaSectionLabelRows[language]).toHaveLength(publicMediaSectionLabelSources.length);
    expect(publicMediaExperienceRows[language]).toHaveLength(publicMediaExperienceSources.length);
    const instance = createInstance();
    await instance.init({ lng: language, resources: {}, initImmediate: false });
    const sources = [...publicMediaSectionLabelSources, ...publicMediaExperienceSources];
    const expected = [...publicMediaSectionLabelRows[language], ...publicMediaExperienceRows[language]];
    render(<I18nextProvider i18n={instance}>{sources.map((text, index) => <span key={text} data-testid={`media-extra-${index}`}><PublicCopy text={text} /></span>)}</I18nextProvider>);
    sources.forEach((source, index) => {
      const result = screen.getByTestId(`media-extra-${index}`).textContent;
      expect(result).toBe(expected[index]);
      if (language !== 'en') expect(result).not.toBe(source);
    });
  });
  it.each(languages)('preserves approved media limits in %s', language => {
    expect(publicMediaGuideRows[language]).toHaveLength(publicMediaGuideSources.length);
    expect(publicMediaGuideRows[language][3].match(/\d+/g)).toEqual(publicMediaGuideSources[3].match(/\d+/g));
    expect(publicMediaGuideRows[language][3]).toContain('600 MB');
    expect(publicMediaGuideRows[language][3]).toContain('200 GB');
  });
  it.each(languages)('renders table guide and FAQ metadata in %s', async language => {
    const instance = createInstance();
    await instance.init({ lng: language, resources: {}, initImmediate: false });
    const sources = [...publicTableGuideSources, ...publicFaqMetadataSources];
    const expected = [...publicTableGuideRows[language], ...publicFaqMetadataRows[language]];
    expect(publicTableGuideRows[language]).toHaveLength(publicTableGuideSources.length);
    expect(publicFaqMetadataRows[language]).toHaveLength(publicFaqMetadataSources.length);
    render(<I18nextProvider i18n={instance}>{sources.map((text, index) => <span key={text} data-testid={`guide-${index}`}><PublicCopy text={text} /></span>)}</I18nextProvider>);
    sources.forEach((source, index) => {
      const result = screen.getByTestId(`guide-${index}`).textContent;
      expect(result).toBe(expected[index]);
      if (language !== 'en') expect(result).not.toBe(source);
    });
  });
  it.each(languages)('renders complete product and event names in %s', async language => {
    expect(publicFullNameRows[language]).toHaveLength(publicFullNameSources.length);
    const instance = createInstance();
    await instance.init({ lng: language, resources: {}, initImmediate: false });
    render(<I18nextProvider i18n={instance}>{publicFullNameSources.map((text, index) => <span key={text} data-testid={`full-name-${index}`}><PublicCopy text={text} /></span>)}</I18nextProvider>);
    publicFullNameSources.forEach((source, index) => {
      const result = screen.getByTestId(`full-name-${index}`).textContent;
      expect(result).toBe(publicFullNameRows[language][index]);
      if (language !== 'en') expect(result).not.toBe(source);
    });
  });
  it.each(languages)('renders the My Events guide in %s', async language => {
    expect(publicEventOverviewRows[language]).toHaveLength(publicEventOverviewSources.length);
    const instance = createInstance();
    await instance.init({ lng: language, resources: {}, initImmediate: false });
    render(<I18nextProvider i18n={instance}>{publicEventOverviewSources.map((text, index) => <span key={text} data-testid={`overview-${index}`}><PublicCopy text={text} /></span>)}</I18nextProvider>);
    publicEventOverviewSources.forEach((source, index) => {
      const result = screen.getByTestId(`overview-${index}`).textContent;
      expect(result).toBe(publicEventOverviewRows[language][index]);
      if (language !== 'en') expect(result).not.toBe(source);
    });
  });
  it.each(languages)('renders all shared product section labels in %s', async language => {
    expect(publicProductSectionRows[language]).toHaveLength(publicProductSectionSources.length);
    const instance = createInstance();
    await instance.init({ lng: language, resources: {}, initImmediate: false });
    render(<I18nextProvider i18n={instance}>{publicProductSectionSources.map((text, index) => <span key={text} data-testid={`product-label-${index}`}><PublicCopy text={text} /></span>)}</I18nextProvider>);
    publicProductSectionSources.forEach((source, index) => {
      const result = screen.getByTestId(`product-label-${index}`).textContent;
      expect(result).toBe(publicProductSectionRows[language][index]);
      if (language !== 'en') expect(result).not.toBe(source);
    });
  });
  it.each(languages)('has complete aligned catalogue rows for %s', language => {
    for (const [sources, rows] of [[publicUiSources, publicUiRows], [publicPageSources, publicPageRows], [publicSectionSources, publicSectionRows], [publicTrialSources, publicTrialRows], [publicCookieSources, publicCookieRows], [publicContactSources, publicContactRows], [publicProductHeroSources, publicProductHeroRows], [publicWorkflowSources, publicWorkflowRows], [publicNavigationSources, publicNavigationRows], [publicPlatformSources, publicPlatformRows], [publicPlanFaqSources, publicPlanFaqRows], [publicGeneralFaqSources, publicGeneralFaqRows], [publicFeatureFaqSources, publicFeatureFaqRows]] as const) {
      expect(rows[language]).toHaveLength(sources.length);
      for (const value of rows[language]) expect(value.trim()).not.toBe('');
    }
  });
  it.each(languages)('preserves the existing plan FAQ numbers in %s', language => {
    publicPlanFaqSources.forEach((source, index) => {
      expect(publicPlanFaqRows[language][index].match(/\d+/g) || []).toEqual(source.match(/\d+/g) || []);
    });
    for (const name of ['Essential','Premium','Ultimate']) expect(publicPlanFaqRows[language][7]).toContain(name);
    expect(publicPlanFaqRows[language][5]).toContain('A$22');
  });
  it.each(languages)('renders current section headings in %s without HTML injection', async language => {
    const instance = createInstance();
    await instance.init({ lng: language, fallbackLng: 'en', resources: {}, initImmediate: false });
    render(<I18nextProvider i18n={instance}><p data-testid="copy"><PublicCopy text={publicSectionSources[0]} /></p></I18nextProvider>);
    expect(screen.getByTestId('copy').textContent).toBe(publicSectionRows[language][0]);
    expect(screen.getByTestId('copy').children).toHaveLength(0);
  });
  it('preserves brands, unknown text and inline spacing', async () => {
    const instance = createInstance();
    await instance.init({ lng: 'it', resources: {}, initImmediate: false });
    render(<I18nextProvider i18n={instance}><p data-testid="copy"><PublicCopy text="Wedding Waitress" /><PublicCopy text=" Powered by: " /><PublicCopy text="<unmapped>" /></p></I18nextProvider>);
    expect(screen.getByTestId('copy').textContent).toBe('Wedding Waitress Offerto da: <unmapped>');
    expect(screen.getByTestId('copy').querySelector('unmapped')).toBeNull();
  });
  it.each(languages)('renders every Cookie Policy binding in %s', async language => {
    const instance = createInstance();
    await instance.init({ lng: language, resources: {}, initImmediate: false });
    render(<I18nextProvider i18n={instance}>{publicCookieSources.map((text, index) => <span key={index} data-testid={`cookie-${index}`}><PublicCopy text={text} /></span>)}</I18nextProvider>);
    publicCookieSources.forEach((_, index) => {
      expect(screen.getByTestId(`cookie-${index}`).textContent?.trim()).toBe(publicCookieRows[language][index].trim());
    });
  });
});
