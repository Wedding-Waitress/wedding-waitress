import { render, waitFor, cleanup } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it } from 'vitest';
import { SeoHead } from './SeoHead';

afterEach(cleanup);

it('uses the same public metadata after client navigation while retaining private noindex', async () => {
  const view = render(<HelmetProvider><MemoryRouter initialEntries={['/pricing']}><SeoHead title="Old pricing" description="Old description" /></MemoryRouter></HelmetProvider>);
  await waitFor(() => expect(document.title).toBe('Wedding Planning Software Pricing | Wedding Waitress'));
  expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toContain('100, 200 or 400 guests');
  expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe('https://weddingwaitress.com.au/pricing');
  view.unmount();
  render(<HelmetProvider><MemoryRouter initialEntries={['/account/private']}><SeoHead title="Account" description="Private account" noIndex /></MemoryRouter></HelmetProvider>);
  await waitFor(() => expect(document.title).toBe('Account'));
  expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex,nofollow');
});
