import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const publicSiteCss = readFileSync('src/styles/PublicSite.css', 'utf8');
const homepageHeroSource = readFileSync('src/components/Layout/PublicCinematicHero.tsx', 'utf8');
const pageHeroSource = readFileSync('src/components/Layout/PublicPageHero.tsx', 'utf8');

describe('public hero image animation contract', () => {
  it('uses one subtle shared transform animation on the static image layer', () => {
    const imageRule = publicSiteCss.match(
      /\.ww-public-hero-picture img\s*\{([^}]*)\}/,
    )?.[1] ?? '';
    const keyframes = publicSiteCss.match(
      /@keyframes ww-public-hero-zoom\s*\{([\s\S]*?)\n\}/,
    )?.[1] ?? '';

    expect(imageRule).toContain('animation: ww-public-hero-zoom 28s ease-in-out infinite alternate');
    expect(imageRule).toContain('transform-origin: var(--ww-hero-position, center)');
    expect(imageRule).toContain('will-change: transform');
    expect(keyframes).toContain('from { transform: scale(1); }');
    expect(keyframes).toContain('to { transform: scale(1.05); }');
    expect(publicSiteCss.match(/animation:\s*ww-public-hero-zoom/g)).toHaveLength(1);
  });

  it('shares the animated picture across both hero components without targeting video or content', () => {
    expect(homepageHeroSource).toContain('<PublicHeroPicture asset={homepageHeroAsset} />');
    expect(homepageHeroSource).toContain("videoReady ? ' ww-home-video-is-ready' : ''");
    expect(pageHeroSource).toContain('<picture className="ww-public-hero-picture"');
    expect(publicSiteCss).not.toMatch(/\.ww-home-hero-video\s*\{[^}]*ww-public-hero-zoom/);
    expect(publicSiteCss).not.toMatch(/\.ww-public-hero-(?:shade|content)\s*\{[^}]*ww-public-hero-zoom/);
    expect(publicSiteCss).not.toMatch(/\.ww-home-hero-content\s*\{[^}]*ww-public-hero-zoom/);
    expect(publicSiteCss).toMatch(
      /\.ww-home-cinematic-hero\.ww-home-video-is-ready \.ww-public-hero-picture img\s*\{[\s\S]*animation:\s*none;[\s\S]*will-change:\s*auto/,
    );
  });

  it('preserves the responsive focal point and disables movement under reduced motion', () => {
    expect(publicSiteCss).toMatch(
      /@media \(max-width:\s*639px\)[\s\S]*\.ww-public-hero-picture img\s*\{\s*transform-origin:\s*var\(--ww-hero-mobile-position, center\)/,
    );

    const reducedMotion = publicSiteCss.match(
      /@media \(prefers-reduced-motion:\s*reduce\)\s*\{([\s\S]*?)\n\}/,
    )?.[1] ?? '';
    expect(reducedMotion).toMatch(
      /\.ww-public \.ww-public-hero-picture img\s*\{[\s\S]*animation:\s*none !important/,
    );
    expect(reducedMotion).toContain('transform: scale(1) !important');
    expect(reducedMotion).toContain('will-change: auto');
  });
});
