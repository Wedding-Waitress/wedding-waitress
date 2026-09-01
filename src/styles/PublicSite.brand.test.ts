import { readFileSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const publicCss = readFileSync('src/styles/PublicSite.css', 'utf8');
const app = readFileSync('src/App.tsx', 'utf8');
const header = readFileSync('src/components/Layout/Header.tsx', 'utf8');
const landing = readFileSync('src/pages/Landing.tsx', 'utf8');
const productLayout = readFileSync('src/components/Layout/ProductPageLayout.tsx', 'utf8');
const currencySelector = readFileSync('src/components/ui/CurrencySelector.tsx', 'utf8');
const weddingsCardImage = statSync('src/assets/homepage-weddings-card.jpg');

describe('public Wedding Waitress brand colour system', () => {
  it('uses an optimized photograph only for the Weddings homepage event card', () => {
    expect(landing).toContain("import weddingsCardImage from '@/assets/homepage-weddings-card.jpg';");
    expect(landing).toContain('if (index === 0) return');
    expect(landing).toContain('alt="Bride and groom celebrating their wedding"');
    expect(landing).toContain('className="relative aspect-[3/2] w-full"');
    expect(landing).toContain('className="h-full w-full object-contain object-center"');
    expect(landing).toContain('className="absolute inset-x-0 bottom-0 flex h-12 items-center bg-white/50 px-6 backdrop-blur-sm"');
    expect(landing).toContain('className="ww-card ww-focus group overflow-hidden md:col-span-2 lg:col-span-1 ring-2 ring-[#a88558]/30"');
    expect(weddingsCardImage.size).toBeLessThan(300_000);
  });

  it('uses the exact dominant colour sampled from the approved logo as one token', () => {
    expect(publicCss.match(/--ww-dark-brown:/g)).toHaveLength(1);
    expect(publicCss).toContain('--ww-dark-brown: #412419;');
  });

  it('keeps dark surfaces legible while applying dark brown to light headings', () => {
    expect(publicCss).toMatch(/\.ww-public h1,[\s\S]*color: var\(--ww-dark-brown\)/);
    expect(publicCss).toMatch(/\.ww-public \.ww-section-espresso :where\(h1, h2, h3\),[\s\S]*color: #fff/);
    expect(publicCss).toContain('.ww-section-espresso .ww-eyebrow');
    expect(publicCss).toContain('color: var(--ww-champagne);');
  });

  it('implements four desktop mega-menu columns and responsive mobile categories', () => {
    expect(publicCss).toContain('grid-template-columns: repeat(4, minmax(0, 1fr));');
    expect(publicCss).toContain('.ww-mobile-product-grid');
    expect(header).toContain('className="ww-products-menu-grid"');
    expect(header).toContain('className="ww-products-menu-heading"');
    expect(header).toContain('Explore all products →');
  });

  it('shares selected and focus treatments across currency and language menus', () => {
    expect(header).toContain('className="ww-selector-item cursor-pointer rounded-xl"');
    expect(header).toContain("dir={lang.code === 'ar' ? 'rtl' : 'ltr'}");
    expect(currencySelector).toContain('data-selected={active}');
    expect(currencySelector).toContain('ww-selector-trigger');
  });

  it('uses a balanced four-column desktop and two-column tablet/mobile home product grid', () => {
    expect(publicCss).toContain('.ww-product-icon-grid .ww-icon-orb { width: 6.25rem; height: 6.25rem; }');
    expect(publicCss).toContain('.ww-product-icon-grid .ww-icon-orb svg { width: 2.625rem; height: 2.625rem; }');
    expect(landing).toContain('ww-product-icon-grid mt-10 grid grid-cols-2 gap-x-2 gap-y-8 lg:grid-cols-4');
    expect(landing).not.toContain('ww-product-icon-grid mt-10 grid grid-cols-2 gap-x-2 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5');
  });

  it('removes the homepage pricing section without removing pricing navigation or its page', () => {
    expect(landing).not.toContain('Straightforward pricing');
    expect(landing).not.toContain('One event. Twelve months. The complete platform.');
    expect(landing).not.toContain('Compare Pricing');
    expect(header).toContain('<Link to="/pricing"');
    expect(app).toContain('<Route path="/pricing" element={<Pricing />} />');
  });

  it('shares the approved embossed button surface with public icon medallions', () => {
    expect(publicCss).toContain('--ww-embossed-surface:');
    expect(publicCss).toMatch(/\.ww-button-primary,[\s\S]*background: var\(--ww-embossed-surface\) !important;/);
    expect(publicCss).toMatch(/\.ww-icon-orb \{[\s\S]*background: var\(--ww-embossed-surface\);[\s\S]*aspect-ratio: 1;/);
    expect(publicCss).toContain('.ww-public .group:is(a, button):hover .ww-icon-orb');
    expect(publicCss).toContain('.ww-public .group:is(a, button):active .ww-icon-orb');
    expect(landing).not.toContain('group-hover:-translate-y-1');
  });

  it('uses two-pixel surface-aware image borders without padded frames', () => {
    expect(publicCss).toContain('border: 2px solid var(--ww-dark-brown);');
    expect(publicCss).toMatch(/\.ww-image-frame \{[^}]*padding: 0;/);
    expect(publicCss).toContain('.ww-section-espresso .ww-image-frame');
    expect(publicCss).toContain('border-color: var(--ww-champagne);');
    expect(productLayout).toContain('className="ww-media-card"');
  });
});
