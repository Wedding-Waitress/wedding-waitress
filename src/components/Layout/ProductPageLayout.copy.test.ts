import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { readEnglishPublicSource } from '@/test/readEnglishPublicSource';
const source = readEnglishPublicSource('src/components/Layout/ProductPageLayout.tsx');

describe('public product final CTA copy', () => {
  it('preserves the DJ & MC acronym only for the questionnaire product', () => {
    expect(source).toContain(
      "product.id === 'dj-mc-questionnaire' ? 'DJ & MC Questionnaire' : product.shortName.toLowerCase()",
    );
    expect(source).toContain('Start planning {ctaProductName} in one connected place');
  });
});
