import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('shared public header logo', () => {
  it('uses the optimized dark-brown public asset with intrinsic dimensions', () => {
    const header = readFileSync('src/components/Layout/Header.tsx', 'utf8');
    const footer = readFileSync('src/components/Layout/PublicFooter.tsx', 'utf8');

    expect(header).toContain('src="/wedding-waitress-logo-dark-brown.png"');
    expect(header).toContain('alt="Wedding Waitress"');
    expect(header).toContain('width="1920"');
    expect(header).toContain('height="464"');
    expect(header).toContain('className="h-12 lg:h-14 w-auto hover:opacity-80 transition-opacity"');
    expect(footer).toContain('src="/wedding-waitress-logo-full.png"');
    expect(footer).toContain('brightness-0 invert');
    expect(footer).not.toContain('wedding-waitress-logo-dark-brown.png');
  });

  it('aligns the header logo to the footer content container', () => {
    const header = readFileSync('src/components/Layout/Header.tsx', 'utf8');
    const footer = readFileSync('src/components/Layout/PublicFooter.tsx', 'utf8');

    expect(header).toContain('className="w-full px-4 py-3"');
    expect(header).toContain('mx-auto flex items-center justify-between');
    expect(header).toContain("!user ? 'max-w-[81rem] min-[1320px]:justify-end min-[1320px]:gap-2' : 'max-w-7xl'");
    expect(header).toContain("!user ? 'min-[1320px]:-translate-x-2 min-[1320px]:pr-3' : ''");
    expect(header).toContain('ww-public-nav-link whitespace-nowrap');
    expect(header).toContain('hidden min-[1320px]:flex');
    expect(header).toContain('min-[1320px]:hidden relative');
    expect(footer).toContain('className="ww-public-dashboard-background px-4 py-14 text-white"');
    expect(footer).toContain('className="mx-auto max-w-7xl"');
  });
});
