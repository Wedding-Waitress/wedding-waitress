import { describe, expect, it } from 'vitest';
import { publicProducts } from '@/content/publicProducts';
import { productIconById, productNavigationItems } from './productNavigation';
import { PLANNING_WORKFLOW_STEPS } from './planningWorkflow';

describe('shared product navigation icon configuration', () => {
  it('defines one unique dashboard mapping for all 15 public products', () => {
    expect(productNavigationItems).toHaveLength(15);
    expect(new Set(productNavigationItems.map((item) => item.productId)).size).toBe(15);
    expect(new Set(productNavigationItems.map((item) => item.sidebarId)).size).toBe(15);
  });

  it('gives every public product navigation link the same icon reference as its dashboard item', () => {
    for (const product of publicProducts) {
      expect(product.navigationIcon, product.name).toBe(productIconById[product.id]);
    }
  });

  it('places all remaining products after the approved first four workflow pages', () => {
    const remaining = productNavigationItems.filter((item) => !['my-events', 'table-list', 'guest-list'].includes(item.sidebarId));
    expect([...PLANNING_WORKFLOW_STEPS.map((step) => step.label), remaining[0].sidebarLabel]).toEqual([
      'My Events', 'Event Budget Planner', 'Tables', 'Guest List', 'QR Code Seating Chart',
    ]);
  });
});
