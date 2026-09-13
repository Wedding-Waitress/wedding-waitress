import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const publicSiteCss = readFileSync('src/styles/PublicSite.css', 'utf8').replace(/\r\n/g, '\n');

describe('public hero viewport sizing contract', () => {
  it('uses one full-width, below-header minimum height for every shared hero', () => {
    const sharedRule = publicSiteCss.match(/\.ww-public-photo-hero,\s*\.ww-home-cinematic-hero\s*\{([\s\S]*?)\}/)?.[1] ?? '';

    expect(sharedRule).toContain('width: 100%');
    expect(sharedRule).toContain('max-width: none');
    expect(sharedRule).toContain('margin: 0');
    expect(sharedRule).toContain('overflow: hidden');
    expect(sharedRule).toContain('min-height: calc(100vh - var(--ww-public-header-height))');
    expect(sharedRule).toContain('min-height: calc(100svh - var(--ww-public-header-height))');
    expect(sharedRule).toContain('min-height: calc(100dvh - var(--ww-public-header-height))');
  });

  it('matches the existing responsive public header heights and has no compact override', () => {
    expect(publicSiteCss).toMatch(/--ww-public-header-height:\s*4\.5rem/);
    expect(publicSiteCss).toMatch(/@media \(min-width:\s*1024px\)[\s\S]*--ww-public-header-height:\s*5rem/);
    expect(publicSiteCss).not.toMatch(/\.ww-public-photo-hero-compact\s*\{[^}]*min-height/);
  });

  it('gives both shared hero content blocks the same responsive safe gutter', () => {
    const contentRule = publicSiteCss.match(/\.ww-public-hero-content,\s*\.ww-home-hero-content\s*\{([\s\S]*?)\}/)?.[1] ?? '';

    expect(contentRule).toContain('box-sizing: border-box');
    expect(contentRule).toContain('padding-inline: var(--ww-public-hero-gutter)');
    expect(contentRule).toContain('text-align: left');
    expect(publicSiteCss).toMatch(/--ww-public-hero-gutter:\s*clamp\(1\.25rem,\s*6vw,\s*1\.5rem\)/);
    expect(publicSiteCss).toMatch(/@media \(min-width:\s*640px\) and \(max-width:\s*1023px\)[\s\S]*--ww-public-hero-gutter:\s*2\.5rem/);
    expect(publicSiteCss).toMatch(/@media \(min-width:\s*1024px\)[\s\S]*--ww-public-hero-gutter:\s*clamp\(3rem,\s*7vw,\s*8\.75rem\)/);
  });

  it('keeps every shared photographic hero shade at seventy-two percent of its original opacity', () => {
    expect(publicSiteCss).toContain(
      '.ww-public-hero-shade {\n  z-index: 2;\n  background: linear-gradient(90deg, rgba(25,12,8,.648) 0%, rgba(35,18,12,.5184) 36%, rgba(35,18,12,.144) 70%, rgba(20,10,7,.0576) 100%), linear-gradient(0deg, rgba(18,8,5,.2304), transparent 48%);\n}',
    );
    expect(publicSiteCss).toContain(
      '.ww-public-hero-shade { background: linear-gradient(0deg, rgba(25,12,8,.6768) 0%, rgba(31,15,10,.5184) 55%, rgba(24,11,8,.1296) 100%); }',
    );
    expect(publicSiteCss).not.toContain('.ww-home-cinematic-hero .ww-public-hero-shade');
  });
});
