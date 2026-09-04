import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const publicSiteCss = readFileSync('src/styles/PublicSite.css', 'utf8');

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
});
