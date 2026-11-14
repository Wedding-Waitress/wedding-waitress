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
 * Package checkout is enabled for the verified current live Stripe catalogue.
 * This prevents a newly advertised amount from ever initiating an old-price charge.
 */
export const PACKAGE_CHECKOUT_AVAILABLE = true;

export const PACKAGE_CHECKOUT_NOTICE =
  'Package checkout is temporarily unavailable while the new prices are prepared. No payment will be taken.';
