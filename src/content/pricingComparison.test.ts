import { describe, expect, it } from 'vitest';
import {
  estimatedSeparateToolValueAud,
  pricingComparisonRows,
  valuedMainProductCount,
} from './pricingComparison';

describe('pricing comparison estimates and totals', () => {
  it('calculates the displayed total from the 15 main products only', () => {
    expect(valuedMainProductCount).toBe(15);
    expect(estimatedSeparateToolValueAud).toBe(15 * 147);
  });

  it('uses the approved minimum estimate for every counted main product', () => {
    const counted = pricingComparisonRows.filter((row) => row.cost.countsTowardTotal);
    expect(counted.every((row) => row.cost.display === 'Estimated from A$147')).toBe(true);
    expect(counted.every((row) => row.cost.estimatedAud === 147)).toBe(true);
  });

  it('does not count ceremony and reception floor plans separately', () => {
    const floorPlanRows = pricingComparisonRows.filter((row) => row.product.includes('floor layout'));
    expect(floorPlanRows).toHaveLength(2);
    expect(floorPlanRows.filter((row) => row.cost.countsTowardTotal)).toHaveLength(1);
    expect(floorPlanRows[1].cost.display).toBe('Included in A$147 Floor Plan estimate');
  });

  it('does not count the five photo-suite subfeatures separately', () => {
    const subfeatures = pricingComparisonRows.filter((row) => row.indent);
    expect(subfeatures).toHaveLength(5);
    expect(subfeatures.every((row) => !row.cost.countsTowardTotal)).toBe(true);
    expect(subfeatures.every((row) => row.cost.display === 'Included in A$147 Photo & Video Sharing estimate')).toBe(true);
  });
});
