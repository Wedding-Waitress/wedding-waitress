import { PACKAGE_PRICES_AUD } from './packagePricing';
import { ACCESS_EXTENSION_MONTHLY_PRICE_CENTS } from './stripeExtensionPrices';

/** Provisioning plan only; never enables checkout or reuses live provider IDs. */
export const STRIPE_TEST_CATALOGUE = [
  { key: 'essential', name: 'Essential', cents: PACKAGE_PRICES_AUD.essential * 100 },
  { key: 'premium', name: 'Premium', cents: PACKAGE_PRICES_AUD.premium * 100 },
  { key: 'unlimited', name: 'Ultimate', cents: PACKAGE_PRICES_AUD.unlimited * 100 },
  { key: 'essential_to_premium', name: 'Essential to Premium upgrade', cents: (PACKAGE_PRICES_AUD.premium - PACKAGE_PRICES_AUD.essential) * 100 },
  { key: 'premium_to_unlimited', name: 'Premium to Ultimate upgrade', cents: (PACKAGE_PRICES_AUD.unlimited - PACKAGE_PRICES_AUD.premium) * 100 },
  { key: 'essential_to_unlimited', name: 'Essential to Ultimate upgrade', cents: (PACKAGE_PRICES_AUD.unlimited - PACKAGE_PRICES_AUD.essential) * 100 },
  { key: 'additional_event', name: 'Additional event', cents: 9000 },
  { key: 'guest_capacity_10', name: '10 additional guests', cents: 1000 },
  { key: 'communication_10', name: '10 shared Email and SMS credits', cents: 1000 },
  { key: 'communication_100', name: '100 shared Email and SMS credits', cents: 4900 },
  { key: 'access_extension_month', name: 'One prepaid access-extension month', cents: ACCESS_EXTENSION_MONTHLY_PRICE_CENTS },
].map(item => ({ ...item, currency: 'aud' as const, recurring: false as const,
  taxBehavior: 'exclusive' as const,
  lookupKey: item.key === 'additional_event' ? 'ww_test_v2_additional_event_99_total' : `ww_test_v1_${item.key}` }));

export function requireStripeSandbox(account: { livemode: boolean }) {
  if (account.livemode !== false) throw new Error('Sandbox account access is required; live catalogue must not be changed.');
}

