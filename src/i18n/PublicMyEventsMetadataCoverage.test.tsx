import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { createInstance } from 'i18next';
import { I18nextProvider } from 'react-i18next';
import { afterEach, expect, it } from 'vitest';
import { publicProducts } from '@/content/publicProducts';
import { PublicCopy } from './PublicCopy';
import { publicMyEventsMetadataRows, publicMyEventsMetadataSources } from './publicMyEventsMetadataCopy';
import { publicProductImageTemplateRows } from './publicProductImageTemplateCopy';
import { usePublicCopy } from './usePublicCopy';
afterEach(cleanup);
function ImageDescription() {
  const copy = usePublicCopy();
  return <span data-testid="image-description">{copy('{{image}} product demonstration').replace('{{image}}', copy(publicMyEventsMetadataSources[2]))}</span>;
}
for (const language of Object.keys(publicMyEventsMetadataRows)) {
  it(`translates My Events source metadata and complete image label in ${language}`, async () => {
    const product = publicProducts.find(item => item.id === 'my-events')!;
    expect([product.seoTitle, product.metaDescription, product.imageAlt]).toEqual([...publicMyEventsMetadataSources]);
    const instance = createInstance();
    await instance.init({lng: language, resources: {}, initImmediate:false});
    render(<I18nextProvider i18n={instance}>{publicMyEventsMetadataSources.map((text,index)=><span key={index} data-testid={`source-${index}`}><PublicCopy text={text}/></span>)}<ImageDescription/></I18nextProvider>);
    publicMyEventsMetadataRows[language].forEach((text,index)=>expect(screen.getByTestId(`source-${index}`).textContent).toBe(text));
    expect(screen.getByTestId('image-description').textContent).toBe(publicProductImageTemplateRows[language][0].replace('{{image}}',publicMyEventsMetadataRows[language][2]));
  });
}
