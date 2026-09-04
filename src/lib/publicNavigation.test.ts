import { describe, expect, it } from 'vitest';

import { publicEventTypes } from '@/content/publicEventTypes';
import { productsByGroup } from '@/content/publicProducts';
import { publicHeroByRoute } from '@/config/publicHeroManifest';
import {
  getActivePublicNavigation,
  isCurrentPublicPath,
  matchesPublicRoutePattern,
  normalizePublicPath,
} from '@/lib/publicNavigation';

describe('public navigation route matching', () => {
  it('does not activate a navigation item on the homepage', () => {
    expect(getActivePublicNavigation('/')).toBeNull();
  });

  it.each([
    ['/how-it-works', 'how-it-works'],
    ['/pricing', 'pricing'],
    ['/faq', 'faq'],
    ['/contact', 'contact'],
    ['/blog', 'blog'],
    ['/blog/planning-a-wedding', 'blog'],
  ] as const)('matches %s to %s', (path, navigationId) => {
    expect(getActivePublicNavigation(path)).toBe(navigationId);
  });

  it('groups every public product route under Products', () => {
    const productPaths = productsByGroup.flatMap((group) => group.products.map((product) => product.path));

    expect(getActivePublicNavigation('/products')).toBe('products');
    productPaths.forEach((path) => expect(getActivePublicNavigation(path)).toBe('products'));
  });

  it('groups every public event route under Events', () => {
    expect(getActivePublicNavigation('/events')).toBe('events');
    publicEventTypes.forEach((eventType) => {
      expect(getActivePublicNavigation(eventType.path)).toBe('events');
    });
  });

  it('groups every navigation-tagged hero route under its declared parent', () => {
    Object.entries(publicHeroByRoute).forEach(([path, hero]) => {
      if (!hero.navigationParent) return;
      expect(getActivePublicNavigation(path)).toBe(hero.navigationParent);
    });
  });

  it('normalizes trailing slashes, query strings and hashes', () => {
    expect(normalizePublicPath('/pricing/?currency=AUD#plans')).toBe('/pricing');
    expect(getActivePublicNavigation('/pricing/?currency=AUD#plans')).toBe('pricing');
    expect(isCurrentPublicPath('/pricing/', '/pricing')).toBe(true);
  });

  it.each(['/products-old', '/my-events-preview', '/eventual', '/blogger']) (
    'does not activate a group for a partial route match: %s',
    (path) => {
      expect(getActivePublicNavigation(path)).toBeNull();
    },
  );

  it('matches parameterized manifest routes by complete route segments', () => {
    expect(matchesPublicRoutePattern('/products/example', '/products/:slug')).toBe(true);
    expect(matchesPublicRoutePattern('/products/example/details', '/products/:slug')).toBe(false);
    expect(matchesPublicRoutePattern('/products-old/example', '/products/:slug')).toBe(false);
  });

  it('marks only the exact destination as the current page', () => {
    expect(isCurrentPublicPath('/blog', '/blog')).toBe(true);
    expect(isCurrentPublicPath('/blog/article', '/blog')).toBe(false);
  });
});
