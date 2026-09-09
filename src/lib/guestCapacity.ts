export const GUEST_CAPACITY_BLOCK = {
  guests: 10,
  priceAud: 10,
  minimumBlocks: 1,
  maximumBlocksPerCheckout: 100,
} as const;

export const blocksForGuestShortfall = (
  currentGuests: number,
  entitledCapacity: number,
): number => Math.max(
  GUEST_CAPACITY_BLOCK.minimumBlocks,
  Math.ceil(Math.max(0, currentGuests - entitledCapacity) / GUEST_CAPACITY_BLOCK.guests),
);

export const normalizeGuestCapacityBlocks = (blocks: number): number => {
  if (!Number.isFinite(blocks)) return GUEST_CAPACITY_BLOCK.minimumBlocks;
  return Math.min(
    GUEST_CAPACITY_BLOCK.maximumBlocksPerCheckout,
    Math.max(GUEST_CAPACITY_BLOCK.minimumBlocks, Math.floor(blocks)),
  );
};

export const guestCapacityQuote = (blocks: number) => {
  const normalizedBlocks = normalizeGuestCapacityBlocks(blocks);
  return {
    blocks: normalizedBlocks,
    additionalGuests: normalizedBlocks * GUEST_CAPACITY_BLOCK.guests,
    totalAud: normalizedBlocks * GUEST_CAPACITY_BLOCK.priceAud,
  };
};
