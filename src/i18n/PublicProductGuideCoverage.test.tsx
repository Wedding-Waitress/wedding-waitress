import React from 'react';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { cleanup, render, screen } from '@testing-library/react';
import { createInstance } from 'i18next';
import { I18nextProvider } from 'react-i18next';
import { afterEach, describe, expect, it } from 'vitest';
import { PublicCopy } from './PublicCopy';

const ast = ts.createSourceFile('publicProducts.ts', readFileSync('src/content/publicProducts.ts', 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
const guides = new Map<string, string[]>();
function visit(node: ts.Node) {
  if (ts.isObjectLiteralExpression(node)) {
    const id = node.properties.find(property => ts.isPropertyAssignment(property) && property.name.getText(ast) === 'id');
if (id && ts.isPropertyAssignment(id) && ts.isStringLiteral(id.initializer) && ['my-events','event-budget-planner','tables','guest-list','floor-plan','qr-code-seating-chart','live-slideshow','invitations-cards','photo-video-sharing','seating-chart-signs','name-place-cards','individual-table-charts','full-seating-chart','dietary-requirements','dj-mc-questionnaire','running-sheet'].includes(id.initializer.text)) {
      const messages: string[] = [];
      const collect = (child: ts.Node) => {
        if (ts.isPropertyAssignment(child) && ['lead','demonstration','title','text','connects'].includes(child.name.getText(ast))) {
          if (!ts.isStringLiteral(child.initializer)) throw new Error('Audit dynamic product guide copy before changing its source shape');
          messages.push(child.initializer.text);
        } else ts.forEachChild(child, collect);
      };
      collect(node);
      guides.set(id.initializer.text, messages);
    }
  }
  ts.forEachChild(node, visit);
}
visit(ast);
afterEach(cleanup);
describe('actual public product guide translations', () => {
  it('audits nine guide messages in each covered product', () => {
    expect([...guides.keys()]).toEqual(['my-events','event-budget-planner','tables','guest-list','floor-plan','qr-code-seating-chart','live-slideshow','invitations-cards','photo-video-sharing','seating-chart-signs','name-place-cards','individual-table-charts','full-seating-chart','dietary-requirements','dj-mc-questionnaire','running-sheet']);
    for (const messages of guides.values()) expect(messages).toHaveLength(9);
  });
  for (const [product, messages] of guides) {
    it.each(['en','it','ar','zh','vi','hi','tr','de','es','fr','nl','ja','el'])(`${product} has no English guide fallback in %s`, async language => {
      const instance = createInstance();
      await instance.init({ lng: language, resources: {}, initImmediate: false });
      render(<I18nextProvider i18n={instance}>{messages.map((text, index) => <span key={index} data-testid={`message-${index}`}><PublicCopy text={text} /></span>)}</I18nextProvider>);
      messages.forEach((text, index) => {
        const translated = screen.getByTestId(`message-${index}`).textContent;
        expect(translated?.trim()).not.toBe('');
        if (language === 'en') expect(translated).toBe(text);
        else expect(translated).not.toBe(text);
      });
    });
  }
});
