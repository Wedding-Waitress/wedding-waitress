import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import postcss from 'postcss';
import { publicProducts } from '@/content/publicProducts';
import { publicEventTypes } from '@/content/publicEventTypes';
import { publicHeroByRoute, publicHeroForRoute } from '@/config/publicHeroManifest';

const routes = ['/contact', '/faq', '/blog', '/pricing', '/how-it-works', ...publicProducts.map(product => product.path), ...publicEventTypes.map(event => event.path)];
const css = readFileSync('src/styles/PublicHeroPolishBatch.css', 'utf8');

describe('unpublished public hero colour batch scope', () => {
  it('covers exactly the 27 approved canonical public pages', () => {
    const selected = [...new Set([...css.matchAll(/data-hero-polish-route="([^"]+)"/g)].map(match => match[1]))];
    expect(routes).toHaveLength(27);
    expect(selected.sort()).toEqual([...routes].sort());
    for (const route of routes) {
      const asset = publicHeroForRoute(route);
      expect(asset.publicRoute).toBe(route);
      expect(asset.fallback).toBe(publicHeroByRoute[route].fallback);
      expect(asset.position).toBe(publicHeroByRoute[route].position);
      expect(asset.mobilePosition).toBe(publicHeroByRoute[route].mobilePosition);
    }
  });

  it('changes only filter/background or route-local colour variables', () => {
    const parsed = postcss.parse(css);
    parsed.walkRules(rule => {
      expect(rule.selector).toContain('.ww-public-photo-hero[data-hero-polish-route=');
      rule.walkDecls(declaration => {
        expect(declaration.prop.startsWith('--hero-polish-') || ['filter', 'background'].includes(declaration.prop)).toBe(true);
        if (declaration.prop === 'filter') expect(rule.selector).toContain('> .ww-public-hero-picture img');
        if (declaration.prop === 'background') expect(rule.selector).toContain('> .ww-public-hero-shade');
      });
    });
    for (const excluded of ['/blog/:slug', '/dashboard', '/share/', '/privacy', '/terms', '/venues']) expect(css).not.toContain(`data-hero-polish-route="${excluded}`);
  });
});
