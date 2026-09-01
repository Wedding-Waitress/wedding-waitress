import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const footer = readFileSync('src/components/Layout/PublicFooter.tsx', 'utf8');

describe('public footer navigation', () => {
  it('uses the approved Plan & Organise order and budget planner route', () => {
    const products = readFileSync('src/content/publicProducts.ts', 'utf8');
    const ids = ['my-events', 'event-budget-planner', 'tables', 'guest-list', 'floor-plan'];

    ids.slice(1).forEach((id, index) => {
      expect(products.indexOf(`id: '${id}'`)).toBeGreaterThan(products.indexOf(`id: '${ids[index]}'`));
    });
    expect(products).toContain("shortName: 'Floor Plans'");
    expect(products).toContain("path: '/event-budget-planner'");
  });

  it('gives all eleven bottom navigation links a brighter and bolder hover state', () => {
    expect(footer.match(/className="hover:font-semibold hover:text-white"/g)).toHaveLength(11);
  });
});
