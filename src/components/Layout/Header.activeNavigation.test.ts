import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const header = readFileSync('src/components/Layout/Header.tsx', 'utf8');
const publicCss = readFileSync('src/styles/PublicSite.css', 'utf8');

describe('public header parent active navigation', () => {
  it('uses one route-derived family state for desktop and mobile Products and Events', () => {
    expect(header).toContain('const activeNavigation = getActivePublicNavigation(location.pathname);');
    expect(header.match(/aria-current=\{activeNavigation === 'products' \? 'page' : undefined\}/g)).toHaveLength(2);
    expect(header.match(/aria-current=\{activeNavigation === 'events' \? 'page' : undefined\}/g)).toHaveLength(2);
    expect(header).not.toContain("aria-current={location.pathname === '/products'");
    expect(header).not.toContain("aria-current={location.pathname === '/events'");
  });

  it('preserves exact child-link active states in desktop and mobile dropdowns', () => {
    expect(header.match(/aria-current=\{isCurrentPath\(product\.path\) \? 'page' : undefined\}/g)).toHaveLength(2);
    expect(header.match(/aria-current=\{isCurrentPath\(eventType\.path\) \? 'page' : undefined\}/g)).toHaveLength(2);
  });

  it('reuses the existing top-level active visual treatment', () => {
    expect(publicCss).toMatch(
      /\.ww-public-nav-link:hover,\s*\.ww-public-nav-link\[aria-current="page"\],[\s\S]*background:\s*var\(--ww-cream\) !important;/,
    );
  });
});
