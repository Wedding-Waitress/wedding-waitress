import React from 'react';
import { readFileSync } from 'node:fs';
import { cleanup, render, screen } from '@testing-library/react';
import { createInstance } from 'i18next';
import { I18nextProvider } from 'react-i18next';
import { afterEach, expect, it } from 'vitest';
import { PublicCopy } from './PublicCopy';
import { publicProductsMetadataRows, publicProductsMetadataSources } from './publicProductsMetadataCopy';

afterEach(cleanup);
for (const language of Object.keys(publicProductsMetadataRows)) {
  it(`renders the actual products index metadata in ${language}`, async () => {
    const source = readFileSync('src/pages/Products.tsx', 'utf8');
    publicProductsMetadataSources.forEach(text => expect(source).toContain(`copy(${JSON.stringify(text)})`));
    const instance = createInstance();
    await instance.init({ lng: language, resources: {}, initImmediate: false });
    render(<I18nextProvider i18n={instance}>{publicProductsMetadataSources.map((text, index) => <span key={index} data-testid={`metadata-${index}`}><PublicCopy text={text}/></span>)}</I18nextProvider>);
    publicProductsMetadataRows[language].forEach((text, index) => expect(screen.getByTestId(`metadata-${index}`).textContent).toBe(text));
    expect(source).toContain('alt={copy(product.imageAlt)}');
    expect(source).toContain('name: copy(product.name)');
  });
}
