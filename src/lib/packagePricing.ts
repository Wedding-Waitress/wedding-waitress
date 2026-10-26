export const PACKAGE_PRICES_AUD = {
  essential: 199,
  premium: 249,
  unlimited: 299,
  /** Legacy billing reference only; Vendor Pro is not an active offering. */
  vendor_pro: 300,
} as const;

export const AUSTRALIAN_GST_RATE = 0.1;

export const gstInclusiveAud = (exGstAmount: number): number =>
  Math.round(exGstAmount * (1 + AUSTRALIAN_GST_RATE) * 100) / 100;

/**
 * Enable only with the verified Stripe live AUD v2 catalogue and matching
 * hosted checkout and fulfillment handlers. A draft PR alone does not deploy this.
 */
export const PACKAGE_CHECKOUT_AVAILABLE = true;

export const PACKAGE_CHECKOUT_NOTICE =
  'Checkout is temporarily unavailable. No payment will be taken.';
