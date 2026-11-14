import React from 'react';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { cleanup, render, screen } from '@testing-library/react';
import { createInstance } from 'i18next';
import { I18nextProvider } from 'react-i18next';
import { afterEach, describe, expect, it } from 'vitest';
import { PublicCopy } from './PublicCopy';
import { publicEventHeroRows, publicEventHeroSources } from './publicEventHeroCopy';
import { publicEventLeadRows, publicEventLeadSources } from './publicEventLeadCopy';
import { publicEventSectionRows, publicEventSectionSources } from './publicEventSectionCopy';
import { publicEventIndexRows, publicEventIndexSources } from './publicEventIndexCopy';
import { publicEventPlatformRows, publicEventPlatformSources } from './publicEventPlatformCopy';
import { publicEventIndexMetadataRows, publicEventIndexMetadataSources } from './publicEventIndexMetadataCopy';
import { publicEventSeoTitleRows, publicEventSeoTitleSources } from './publicEventSeoTitleCopy';
import { publicEventSeoDescriptionRows, publicEventSeoDescriptionSources } from './publicEventSeoDescriptionCopy';

const ast = ts.createSourceFile('publicEventTypes.ts', readFileSync('src/content/publicEventTypes.ts', 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
const messages: string[] = [];
function visit(node: ts.Node) {
  if (ts.isPropertyAssignment(node) && ['h1','eyebrow','lead','seoTitle','metaDescription'].includes(node.name.getText(ast))) {
    if (!ts.isStringLiteral(node.initializer)) throw new Error('Audit dynamic event hero copy before changing source shape');
    messages.push(node.initializer.text);
  }
  ts.forEachChild(node, visit);
}
visit(ast);
afterEach(cleanup);
describe('actual event guide hero language coverage', () => {
  it('covers headings, eyebrows, introductions and metadata of all six event types', () => expect(messages).toHaveLength(30));
  it.each(['en','it','ar','zh','vi','hi','tr','de','es','fr','nl','ja','el'])('renders all actual event hero headings in %s', async language => {
    expect(publicEventHeroRows[language]).toHaveLength(publicEventHeroSources.length);
    expect(publicEventLeadRows[language]).toHaveLength(publicEventLeadSources.length);
    expect(publicEventSeoTitleRows[language]).toHaveLength(publicEventSeoTitleSources.length);
    expect(publicEventSeoDescriptionRows[language]).toHaveLength(publicEventSeoDescriptionSources.length);
    const instance = createInstance();
    await instance.init({ lng: language, resources: {}, initImmediate: false });
    render(<I18nextProvider i18n={instance}>{messages.map((text, index) => <span key={index} data-testid={`event-hero-${index}`}><PublicCopy text={text} /></span>)}</I18nextProvider>);
    messages.forEach((text, index) => {
      const result = screen.getByTestId(`event-hero-${index}`).textContent;
      expect(result?.trim()).not.toBe('');
      if (language === 'en') expect(result).toBe(text);
      else expect(result).not.toBe(text);
    });
  });
  it.each(['en','it','ar','zh','vi','hi','tr','de','es','fr','nl','ja','el'])('renders shared event sections in %s', async language => {
    const sections = [...publicEventSectionSources, ...publicEventIndexSources, ...publicEventPlatformSources, ...publicEventIndexMetadataSources];
    const expected = [...publicEventSectionRows[language], ...publicEventIndexRows[language], ...publicEventPlatformRows[language], ...publicEventIndexMetadataRows[language]];
    expect(publicEventSectionRows[language]).toHaveLength(publicEventSectionSources.length);
    expect(publicEventIndexRows[language]).toHaveLength(publicEventIndexSources.length);
    expect(publicEventPlatformRows[language]).toHaveLength(publicEventPlatformSources.length);
    expect(publicEventIndexMetadataRows[language]).toHaveLength(publicEventIndexMetadataSources.length);
    const source = readFileSync('src/pages/events/PublicEventRoutes.tsx', 'utf8');
    sections.forEach(text => { if (text === 'Common questions') expect(source).toContain('Frequently asked questions'); else expect(source).toContain(text); });
    const instance = createInstance();
    await instance.init({ lng: language, resources: {}, initImmediate: false });
    render(<I18nextProvider i18n={instance}>{sections.map((text, index) => <span key={index} data-testid={`event-section-${index}`}><PublicCopy text={text} /></span>)}</I18nextProvider>);
    sections.forEach((text, index) => {
      expect(screen.getByTestId(`event-section-${index}`).textContent).toBe(expected[index]);
      if (language !== 'en') expect(expected[index]).not.toBe(text);
    });
  });
});
