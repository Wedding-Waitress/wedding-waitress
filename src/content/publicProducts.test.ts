import { describe, expect, it } from 'vitest';
import { photoVideoSectionIds, productGroups, publicProducts } from './publicProducts';
import { PUBLIC_COUPLE_PLAN_DETAILS } from '@/components/Pricing/PricingSection';
import { PLAN_PRICING, VENDOR_PRICING } from '@/lib/currencyPricing';
import { readFileSync } from 'node:fs';

describe('public product catalogue', () => {
  it('contains all 15 principal products with unique clean URLs', () => {
    expect(publicProducts).toHaveLength(15);
    expect(new Set(publicProducts.map((product) => product.id)).size).toBe(15);
    expect(new Set(publicProducts.map((product) => product.path)).size).toBe(15);
    publicProducts.forEach((product) => expect(product.path).toMatch(/^\/[a-z0-9-]+$/));
  });

  it('assigns every product to a navigation group', () => {
    publicProducts.forEach((product) => expect(productGroups).toContain(product.group));
  });

  it('keeps Photo & Video Sharing as one product with five linkable experiences', () => {
    expect(publicProducts.filter((product) => product.id === 'photo-video-sharing')).toHaveLength(1);
    expect(photoVideoSectionIds).toEqual(['sharing', 'gallery', 'guestbook', 'photo-booth', 'live-slideshow']);
  });

  it('uses the approved Australian public pricing and Ultimate capacity', () => {
    expect(PUBLIC_COUPLE_PLAN_DETAILS).toEqual({
      essential: { name: 'Essential', guests: 100, priceAud: 150 },
      premium: { name: 'Premium', guests: 200, priceAud: 200 },
      unlimited: { name: 'Ultimate', guests: 500, priceAud: 300 },
    });
    expect(PLAN_PRICING.AUD.unlimited.price).toBe(300);
    expect(VENDOR_PRICING.AUD.price).toBe(300);
  });

  it('includes every product in the generated sitemap', () => {
    const sitemap = readFileSync('public/sitemap.xml', 'utf8');
    publicProducts.forEach((product) => expect(sitemap).toContain(`<loc>https://weddingwaitress.com.au${product.path}</loc>`));
  });
});
