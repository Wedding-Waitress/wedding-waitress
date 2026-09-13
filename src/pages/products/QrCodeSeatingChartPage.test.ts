import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const pageSource = readFileSync('src/pages/products/QrCodeSeatingChartPage.tsx', 'utf8');
const routesSource = readFileSync('src/pages/products/PublicProductRoutes.tsx', 'utf8');
const sharedLayoutSource = readFileSync('src/components/Layout/ProductPageLayout.tsx', 'utf8');

describe('QR Code Seating Chart public page copy contract', () => {
  it('uses the dedicated page without changing the shared product layout', () => {
    expect(routesSource).toContain('export const ProductQrCodeSeatingChart = QrCodeSeatingChartPage;');
    expect(sharedLayoutSource).not.toContain('QR code wedding seating chart questions');
  });

  it('sets the approved title, description and single page heading', () => {
    expect(pageSource).toContain("const PAGE_TITLE = 'QR Code Wedding Seating Chart | Wedding Waitress';");
    expect(pageSource).toContain("const META_DESCRIPTION = 'Create a QR code wedding seating chart so guests can scan, search their name and find their table. Try Wedding Waitress free for 7 days with up to 20 guests.';");
    expect(pageSource.match(/<h1\b/g)).toBeNull();
    expect(pageSource).toContain('title="QR Code Wedding Seating Chart"');
    expect(pageSource.match(/<PublicPageHero\b/g)).toHaveLength(1);
  });

  it('keeps the existing actions and adds the complete approved page copy', () => {
    for (const text of [
      'Start Planning Free',
      'See it in action',
      'Scan the code. Search your name. Find your table.',
      'Make finding a table easier for your guests',
      'Your guest list and tables, connected',
      'Complete your wedding seating setup',
      'QR code seating for weddings and corporate events',
      'QR code wedding seating chart questions',
      'Create your wedding QR code seating chart',
    ]) expect(pageSource).toContain(text);
    expect(pageSource.match(/<details\b/g)).toHaveLength(1);
    expect(pageSource).toContain('faqItems.map');
    expect(pageSource).toContain('No credit card is required.');
  });

  it('uses only existing product and event routes for the new links', () => {
    expect(pageSource).toContain('to="/seating-chart-signs"');
    expect(pageSource).toContain('to="/live-slideshow"');
    expect(pageSource).toContain('to="/products"');
    expect(pageSource).toContain('to="/events"');
    expect(pageSource).toContain('to="/dashboard"');
  });
});
