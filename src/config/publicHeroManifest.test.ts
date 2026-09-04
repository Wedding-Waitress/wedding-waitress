import { existsSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  homepageHeroAsset,
  HOMEPAGE_HERO_VIDEO_READY,
  publicHeroByRoute,
} from './publicHeroManifest';
import { publicProducts } from '@/content/publicProducts';
import { publicEventTypes } from '@/content/publicEventTypes';

const publicFile = (url: string) => `public${url}`;

describe('public photographic hero manifest', () => {
  it('covers every principal product and event page with optimized local assets', () => {
    const routes = [
      '/how-it-works', '/products', '/events', '/pricing', '/faq', '/blog', '/blog/:slug', '/contact',
      '/privacy', '/terms', '/cookies', '/venues',
      ...publicProducts.map((product) => product.path),
      ...publicEventTypes.map((eventType) => eventType.path),
    ];

    for (const route of routes) {
      const hero = publicHeroByRoute[route];
      expect(hero, route).toBeDefined();
      for (const source of [hero.avif, hero.webp, hero.fallback]) {
        expect(existsSync(publicFile(source)), `${route}: ${source}`).toBe(true);
        expect(statSync(publicFile(source)).size, `${route}: ${source}`).toBeGreaterThan(10_000);
      }
    }
  });

  it('provides art-directed mobile and desktop homepage posters', () => {
    expect(homepageHeroAsset.mobileAvif).toBeTruthy();
    expect(existsSync(publicFile(homepageHeroAsset.mobileAvif!))).toBe(true);
    expect(HOMEPAGE_HERO_VIDEO_READY).toBe(false);
  });
});
