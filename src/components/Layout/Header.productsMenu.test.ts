import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const header = readFileSync('src/components/Layout/Header.tsx', 'utf8');
const publicCss = readFileSync('src/styles/PublicSite.css', 'utf8');
const products = readFileSync('src/content/publicProducts.ts', 'utf8');

describe('shared public Products menu link feedback', () => {
  it('keeps the Plan & Organise products in the approved order', () => {
    const ids = ['my-events', 'event-budget-planner', 'tables', 'guest-list', 'floor-plan'];
    ids.slice(1).forEach((id, index) => {
      expect(products.indexOf(`id: '${id}'`)).toBeGreaterThan(products.indexOf(`id: '${ids[index]}'`));
    });
  });

  it('marks only the matching desktop and mobile product links as current', () => {
    expect(header.match(/aria-current=\{isCurrentPath\(product\.path\) \? 'page' : undefined\}/g)).toHaveLength(2);
  });

  it('renders the shared product icon beside every desktop and mobile link', () => {
    expect(header.match(/const ProductIcon = product\.navigationIcon;/g)).toHaveLength(2);
    expect(header).toContain('<ProductIcon size={18} strokeWidth={1.8} aria-hidden="true"');
    expect(header).toContain('<ProductIcon size={20} strokeWidth={1.8} aria-hidden="true"');
    expect(publicCss).toContain('grid-template-columns: 18px minmax(0, 1fr);');
    expect(publicCss).toContain('grid-template-columns: 20px minmax(0, 1fr);');
    expect(publicCss).toContain('min-height: 44px;');
  });

  it('provides shared hover, keyboard focus, current-page, and pressed states', () => {
    expect(publicCss).toContain('.ww-products-menu-link:hover');
    expect(publicCss).toContain('.ww-products-menu-link:focus-visible');
    expect(publicCss).toContain('.ww-products-menu-link[data-highlighted]');
    expect(publicCss).toContain('.ww-products-menu-link[aria-current="page"]');
    expect(publicCss).toContain('.ww-products-menu-link:active');
    expect(publicCss).toMatch(/\.ww-products-menu-link:hover,[\s\S]*?font-weight: 600 !important;/);
    expect(publicCss).toMatch(/\.ww-products-menu-link:focus-visible \{[\s\S]*?outline: 2px solid var\(--ww-dark-brown\) !important;/);
    expect(publicCss).toContain('box-shadow: inset 3px 0 0 var(--ww-dark-brown);');
  });

  it('keeps forward and backward Tab navigation in document order without trapping focus', () => {
    expect(header).toContain("if (event.key !== 'Tab') return;");
    expect(header).toContain("currentIndex + (event.shiftKey ? -1 : 1)");
    expect(header).toContain("event.shiftKey ? '/products' : '/pricing'");
    expect(header).toContain('onKeyDownCapture={handleProductsMenuTab}');
  });
});
