import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const publicSiteCss = readFileSync('src/styles/PublicSite.css', 'utf8');
const pageHeroSource = readFileSync('src/components/Layout/PublicPageHero.tsx', 'utf8');
const homepageHeroSource = readFileSync('src/components/Layout/PublicCinematicHero.tsx', 'utf8');

describe('public hero H1 typography contract', () => {
  it('caps the shared hero heading at exactly 75px while retaining responsive scaling', () => {
    const displayRule = publicSiteCss.match(/\.ww-display\s*\{([^}]*)\}/)?.[1] ?? '';

    expect(displayRule).toContain('font-size: clamp(2.45rem, 6vw, 4.6875rem)');
    expect(displayRule).toContain('line-height: .98');
    expect(displayRule).toContain('font-weight: 650');
    expect(displayRule).not.toContain('5.4rem');
  });

  it('limits the shared class to the primary H1 in both public hero components', () => {
    expect(pageHeroSource).toContain('<h1 className="ww-display max-w-4xl">');
    expect(homepageHeroSource).toContain('<h1 className="ww-display max-w-4xl">');
    expect(pageHeroSource).not.toContain('<h2 className="ww-display');
    expect(homepageHeroSource).not.toContain('<h2 className="ww-display');
  });
});
