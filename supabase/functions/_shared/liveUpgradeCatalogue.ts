/** Server-owned upgrade SKUs; caller intent alone never proves source-plan access. */
export const LIVE_UPGRADE_CATALOGUE = {
  essential_to_premium: { productId: 'ww_live_20260914_v2_essential_to_premium', priceId: 'price_1UFTfd5GzTmqOxGKfwtvD4lt', unitAmount: 5000 },
  premium_to_unlimited: { productId: 'ww_live_20260914_v2_premium_to_unlimited', priceId: 'price_1UFTfh5GzTmqOxGKVIAEh8Qq', unitAmount: 5000 },
  essential_to_unlimited: { productId: 'ww_live_20260914_v2_essential_to_unlimited', priceId: 'price_1UFTfl5GzTmqOxGKAugEd75R', unitAmount: 10000 },
} as const;

export function liveUpgradeFor(from: string, to: string) {
  const key = `${from}_to_${to}`;
  if (!Object.prototype.hasOwnProperty.call(LIVE_UPGRADE_CATALOGUE, key)) throw new Error('Unsupported upgrade.');
  return LIVE_UPGRADE_CATALOGUE[key as keyof typeof LIVE_UPGRADE_CATALOGUE];
}

/** Validate a server-retrieved Price, never a browser-provided object. */
export function validateLiveUpgradePrice(price: any, from: string, to: string, expectedDifference: number) {
  const sku = liveUpgradeFor(from, to);
  const product = typeof price?.product === 'string' ? price.product : price?.product?.id;
  if (price?.object !== 'price' || price.id !== sku.priceId || product !== sku.productId
    || price.active !== true || price.livemode !== true || price.currency !== 'aud'
    || price.type !== 'one_time' || price.recurring != null || price.tax_behavior !== 'exclusive'
    || price.unit_amount !== sku.unitAmount || expectedDifference !== sku.unitAmount) {
    throw new Error('Verified upgrade price does not match the approved catalogue.');
  }
  return sku;
}
