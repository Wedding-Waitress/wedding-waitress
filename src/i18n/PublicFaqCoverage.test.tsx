import { publicFaqReviewSources } from './publicFaqReviewCopy';
import { publicLegalTermsSources } from './publicLegalTermsCopy';
import React from 'react';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { cleanup, render, screen } from '@testing-library/react';
import { createInstance } from 'i18next';
import { I18nextProvider } from 'react-i18next';
import { afterEach, describe, expect, it } from 'vitest';
import { PublicCopy } from './PublicCopy';

const ast = ts.createSourceFile('Faq.tsx', readFileSync('src/pages/Faq.tsx', 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const copy: string[] = [];
let pairCount = 0;
function resolveCopy(node: ts.Expression): string[] {
  if (ts.isStringLiteral(node)) return [node.text];
  if (ts.isArrayLiteralExpression(node)) return node.elements.flatMap(resolveCopy);
  if (ts.isElementAccessExpression(node) && ts.isIdentifier(node.expression) && ts.isNumericLiteral(node.argumentExpression)) {
    const sources = node.expression.text === 'publicFaqReviewSources' ? publicFaqReviewSources : node.expression.text === 'publicLegalTermsSources' ? publicLegalTermsSources : null;
    const text = sources?.[Number(node.argumentExpression.text)];
    if (typeof text === 'string') return [text];
  }
  throw new Error('Unrecognised FAQ copy source: ' + node.getText(ast));
}
function visit(node: ts.Node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'faqItems') {
    if (!node.initializer || !ts.isArrayLiteralExpression(node.initializer)) throw new Error('FAQ source must be audited when its data shape changes');
    for (const pair of node.initializer.elements) {
      if (!ts.isArrayLiteralExpression(pair) || pair.elements.length !== 2) throw new Error('Expected FAQ question and answer pair');
      pairCount++;
      copy.push(...pair.elements.flatMap(resolveCopy));
    }
    return;
  }
  ts.forEachChild(node, visit);
}
visit(ast);
afterEach(cleanup);
describe('actual current FAQ translation coverage', () => {
  it('audits all twenty-one question-and-answer pairs including shared legal copy', () => { expect(pairCount).toBe(21); expect(copy).toHaveLength(44); });
  it.each(['en','it','ar','zh','vi','hi','tr','de','es','fr','nl','ja','el'])('renders every actual question and answer in %s', async language => {
    const instance = createInstance();
    await instance.init({ lng: language, resources: {}, initImmediate: false });
    render(<I18nextProvider i18n={instance}>{copy.map((text, index) => <span key={index} data-testid={`faq-${index}`}><PublicCopy text={text} /></span>)}</I18nextProvider>);
    copy.forEach((text, index) => {
      const translated = screen.getByTestId(`faq-${index}`).textContent;
      if (language === 'en') expect(translated).toBe(text);
      else {
        expect(translated?.trim()).not.toBe('');
        expect(translated).not.toBe(text);
      }
    });
  });
});


