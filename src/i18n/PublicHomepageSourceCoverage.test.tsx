import React from 'react';
import fs from 'node:fs';
import ts from 'typescript';
import { cleanup, render, screen } from '@testing-library/react';
import { createInstance } from 'i18next';
import { I18nextProvider } from 'react-i18next';
import { afterEach, expect, it } from 'vitest';
import { PublicCopy } from './PublicCopy';
import { publicLandingDetailSources } from './publicLandingDetailCopy';
import { publicLandingRemainingSources } from './publicLandingRemainingCopy';
import { publicLandingImageSources } from './publicLandingImageCopy';
import { publicLandingMetadataSources } from './publicLandingMetadataCopy';

afterEach(cleanup);
const normalize = (text: string) => text.replace(/\s+/g, ' ').trim().toLowerCase();
const known = new Set<string>();
const index = (value: unknown) => {
  if (typeof value === 'string') known.add(normalize(value));
  else if (value && typeof value === 'object') Object.values(value).forEach(index);
};
for (const namespace of ['common','landing']) index(JSON.parse(fs.readFileSync(`src/i18n/locales/en/${namespace}.json`, 'utf8')));
for (const catalogue of Object.values(import.meta.glob('./public*Copy.ts', { eager: true }))) {
  Object.entries(catalogue as Record<string, unknown>).filter(([key]) => key.endsWith('Sources')).forEach(([,value]) => index(value));
}
['Wedding Waitress','Marketing King Australia','Essential','Premium','Ultimate'].forEach(index);

function homepageAuthoredSources() {
  const source = fs.readFileSync('src/pages/Landing.tsx','utf8');
  const ast = ts.createSourceFile('Landing.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  const authored: string[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && node.expression.getText(ast) === 'copy' && ts.isStringLiteral(node.arguments[0])) authored.push(node.arguments[0].text);
    if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(ast) === 'PublicCopy') {
      for (const attribute of node.attributes.properties) {
        if (ts.isJsxAttribute(attribute) && attribute.name.getText(ast) === 'text' && attribute.initializer && ts.isJsxExpression(attribute.initializer) && attribute.initializer.expression && ts.isStringLiteral(attribute.initializer.expression)) authored.push(attribute.initializer.expression.text);
      }
    }
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'faqs' && node.initializer) {
      const strings = (child: ts.Node) => { if (ts.isStringLiteral(child)) authored.push(child.text); else ts.forEachChild(child,strings); };
      strings(node.initializer);
    }
    ts.forEachChild(node,visit);
  };
  visit(ast);
  return authored;
}

it('requires actual homepage literal bindings, alt text, metadata and FAQ sources to remain catalogued', () => {
  const authored = homepageAuthoredSources();
  expect(authored.length).toBeGreaterThan(40);
  expect(authored.filter(text => !known.has(normalize(text)))).toEqual([]);
});

for (const language of ['it','ar','zh','vi','hi','tr','de','es','fr','nl','ja','el']) {
  it(`renders every current literal homepage source without English fallback in ${language}`, async () => {
    const instance = createInstance();
    const resources = { [language]: {
      common: JSON.parse(fs.readFileSync(`src/i18n/locales/${language}/common.json`, 'utf8')),
      landing: JSON.parse(fs.readFileSync(`src/i18n/locales/${language}/landing.json`, 'utf8')),
    } };
    await instance.init({lng:language,resources,ns:['common','landing'],initImmediate:false});
    const sources = [...new Set(homepageAuthoredSources())];
    render(<I18nextProvider i18n={instance}>{sources.map((text,index)=><span key={index} data-testid={`literal-${index}`}><PublicCopy text={text}/></span>)}</I18nextProvider>);
    const unchanged = sources.filter((text,index)=>screen.getByTestId(`literal-${index}`).textContent === text);
    expect(unchanged).toEqual([]);
  });
}

it('Chinese homepage additions render without English fallbacks, including accessible image descriptions',async()=>{
  const instance=createInstance();await instance.init({lng:'zh',resources:{},initImmediate:false});
  const sources=[...publicLandingDetailSources,...publicLandingRemainingSources,...publicLandingImageSources,...publicLandingMetadataSources];
  render(<I18nextProvider i18n={instance}>{sources.map((text,index)=><span key={index} data-testid={`source-${index}`}><PublicCopy text={text}/></span>)}</I18nextProvider>);
  sources.forEach((source,index)=>expect(screen.getByTestId(`source-${index}`).textContent).not.toBe(source));
});
