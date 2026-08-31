export const PACKAGE_PRICES_AUD = {
  essential: 150,
  premium: 200,
  unlimited: 300,
  vendor_pro: 300,
} as const;

export const AUSTRALIAN_GST_RATE = 0.1;

export const gstInclusiveAud = (exGstAmount: number): number =>
  Math.round(exGstAmount * (1 + AUSTRALIAN_GST_RATE) * 100) / 100;

/**
 * Package checkout stays unavailable until Stripe has matching prices.
 * This prevents a newly advertised amount from ever initiating an old-price charge.
 */
export const PACKAGE_CHECKOUT_AVAILABLE = false;

export const PACKAGE_CHECKOUT_NOTICE =
  'Package checkout is temporarily unavailable while the new prices are prepared. No payment will be taken.';
