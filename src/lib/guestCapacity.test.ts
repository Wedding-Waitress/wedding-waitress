import { describe, expect, it } from 'vitest';
import {
  blocksForGuestShortfall,
  guestCapacityQuote,
  normalizeGuestCapacityBlocks,
} from './guestCapacity';

describe('guest capacity block pricing', () => {
  it.each([
    { used: 105, capacity: 100, blocks: 1, spaces: 10, price: 10 },
    { used: 115, capacity: 100, blocks: 2, spaces: 20, price: 20 },
    { used: 120, capacity: 100, blocks: 2, spaces: 20, price: 20 },
  ])('rounds $used guests against $capacity capacity to whole blocks', ({ used, capacity, blocks, spaces, price }) => {
    const suggested = blocksForGuestShortfall(used, capacity);
    expect(suggested).toBe(blocks);
    expect(guestCapacityQuote(suggested)).toEqual({ blocks, additionalGuests: spaces, totalAud: price });
  });

  it('offers at least one block for proactive purchases below the limit', () => {
    expect(blocksForGuestShortfall(80, 100)).toBe(1);
  });

  it('accepts whole blocks only and bounds a single checkout', () => {
    expect(normalizeGuestCapacityBlocks(2.9)).toBe(2);
    expect(normalizeGuestCapacityBlocks(0)).toBe(1);
    expect(normalizeGuestCapacityBlocks(999)).toBe(100);
  });
});
