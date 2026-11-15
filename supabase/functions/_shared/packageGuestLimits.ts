/** Paid package capacity shared by the app and promotional checkout responses. */
export const PACKAGE_GUEST_LIMITS = {
  essential: 150,
  premium: 250,
  // Historical database/Stripe key; displayed to customers as Ultimate.
  unlimited: 450,
} as const;
