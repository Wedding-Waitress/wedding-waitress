import { describe, expect, it } from 'vitest';
import { publicEventTypes, relevantEventIdsByProduct } from './publicEventTypes';
import { publicProducts } from './publicProducts';

describe('public event types catalogue', () => {
  it('defines the six unique, canonical event routes', () => {
    expect(publicEventTypes).toHaveLength(6);
    expect(new Set(publicEventTypes.map((eventType) => eventType.id)).size).toBe(6);
    expect(new Set(publicEventTypes.map((eventType) => eventType.path)).size).toBe(6);
    expect(publicEventTypes.every((eventType) => eventType.path.startsWith('/events/'))).toBe(true);
  });

  it('provides unique metadata and substantial event-specific content', () => {
    expect(new Set(publicEventTypes.map((eventType) => eventType.seoTitle)).size).toBe(6);
    expect(new Set(publicEventTypes.map((eventType) => eventType.metaDescription)).size).toBe(6);
    for (const eventType of publicEventTypes) {
      expect(eventType.challenges.length).toBeGreaterThanOrEqual(3);
      expect(eventType.howItWorks.length).toBe(4);
      expect(eventType.benefits.length).toBeGreaterThanOrEqual(3);
      expect(eventType.faqs.length).toBeGreaterThanOrEqual(3);
      expect(eventType.productIds.length).toBeGreaterThanOrEqual(5);
      expect(eventType.relatedEventIds.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('links only to known products and event types', () => {
    const productIds = new Set(publicProducts.map((product) => product.id));
    const eventIds = new Set(publicEventTypes.map((eventType) => eventType.id));
    for (const eventType of publicEventTypes) {
      expect(eventType.productIds.every((id) => productIds.has(id))).toBe(true);
      expect(eventType.relatedEventIds.every((id) => eventIds.has(id))).toBe(true);
    }
    for (const [productId, eventTypeIds] of Object.entries(relevantEventIdsByProduct)) {
      expect(productIds.has(productId)).toBe(true);
      expect(eventTypeIds.every((id) => eventIds.has(id))).toBe(true);
    }
  });
});
