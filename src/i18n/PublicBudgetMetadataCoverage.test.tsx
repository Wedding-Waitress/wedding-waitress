import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { createInstance } from 'i18next';
import { I18nextProvider } from 'react-i18next';
import { afterEach, expect, it } from 'vitest';
import { publicProducts } from '@/content/publicProducts';
import { PublicCopy } from './PublicCopy';
import { publicBudgetMetadataRows, publicBudgetMetadataSources } from './publicBudgetMetadataCopy';
import { publicTablesMetadataRows, publicTablesMetadataSources } from './publicTablesMetadataCopy';
import { publicGuestMetadataRows, publicGuestMetadataSources } from './publicGuestMetadataCopy';
import { publicFloorMetadataRows, publicFloorMetadataSources } from './publicFloorMetadataCopy';
import { publicQrMetadataRows, publicQrMetadataSources } from './publicQrMetadataCopy';
import { publicSlideshowMetadataRows, publicSlideshowMetadataSources } from './publicSlideshowMetadataCopy';
afterEach(cleanup);
for (const [name, sources, rows] of [
  ['budget', publicBudgetMetadataSources, publicBudgetMetadataRows],
  ['tables', publicTablesMetadataSources, publicTablesMetadataRows],
  ['guest list', publicGuestMetadataSources, publicGuestMetadataRows],
  ['floor plans', publicFloorMetadataSources, publicFloorMetadataRows],
  ['QR seating', publicQrMetadataSources, publicQrMetadataRows],
  ['Live Slideshow', publicSlideshowMetadataSources, publicSlideshowMetadataRows],
] as const) {
for (const language of Object.keys(rows)) {
  it(`translates actual ${name} metadata and image description in ${language}`, async () => {
    const product = publicProducts.find(item => item.seoTitle === sources[0])!;
    expect([product.seoTitle, product.metaDescription, product.imageAlt]).toEqual([...sources]);
    const instance = createInstance();
    await instance.init({ lng: language, resources: {}, initImmediate: false });
    render(<I18nextProvider i18n={instance}>{sources.map((text, index) => <span key={index} data-testid={`source-${index}`}><PublicCopy text={text}/></span>)}</I18nextProvider>);
    rows[language].forEach((text, index) => expect(screen.getByTestId(`source-${index}`).textContent).toBe(text));
  });
}
}
