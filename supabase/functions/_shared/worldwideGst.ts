/** Fixed worldwide GST policy supplied by the owner after accountant confirmation.
 * Not an independent determination of tax obligations. No location-based exemption.
 */
export const WORLDWIDE_GST_POLICY_VERSION = 'owner-accountant-worldwide-10-exclusive-v1';
export const WORLDWIDE_GST_RATE_SECRET = 'STRIPE_WORLDWIDE_GST_RATE_ID';
/** Created and visibly verified in the owner's LIVE Wedding Waitress dashboard. */
export const WORLDWIDE_GST_LIVE_RATE_ID = 'txr_1UFTuc5GzTmqOxGKlENAcBIO';

/** Reject existing exemptions before payment rather than charging an unverifiable total.
 * Never override an accountant/customer exemption as a checkout side effect.
 */
export function validateWorldwideGstCustomer(customer: any, userId: string, live: boolean) {
  if (!customer || customer.deleted === true || customer.object !== 'customer' || customer.livemode !== live
    || !/^cus_[A-Za-z0-9]+$/.test(customer.id)
    || ![customer.metadata?.user_id, customer.metadata?.wedding_waitress_user_id].includes(userId)
    || customer.tax_exempt !== 'none') throw new Error('Customer ownership or GST treatment requires review before checkout.');
  return customer.id as string;
}

export function worldwideGstAmounts(baseCents: number, quantity = 1, percentOff = 0) {
  if (!Number.isSafeInteger(baseCents) || baseCents < 0 || !Number.isSafeInteger(quantity) || quantity < 1
    || !Number.isSafeInteger(percentOff) || percentOff < 0 || percentOff > 100) throw new Error('Invalid GST quote.');
  const originalCents = baseCents * quantity;
  if (!Number.isSafeInteger(originalCents)) throw new Error('GST quote exceeds safe amount limits.');
  const discountCents = Math.round(originalCents * percentOff / 100);
  const taxableCents = originalCents - discountCents;
  const taxCents = Math.round(taxableCents / 10);
  const totalCents = taxableCents + taxCents;
  if (!Number.isSafeInteger(totalCents)) throw new Error('GST total exceeds safe amount limits.');
  return { originalCents, discountCents, taxableCents, taxCents, totalCents };
}

/** Input must be retrieved by the server from Stripe, not sent by a browser. */
export function validateWorldwideGstRate(rate: any, configuredId: unknown, livemode: boolean): string {
  if (typeof configuredId !== 'string' || !/^txr_[A-Za-z0-9]+$/.test(configuredId)
    || rate?.object !== 'tax_rate' || rate.id !== configuredId || rate.active !== true
    || rate.livemode !== livemode || rate.inclusive !== false || rate.percentage !== 10
    || !(rate.tax_type === 'gst' || (rate.tax_type == null && livemode === true && configuredId === WORLDWIDE_GST_LIVE_RATE_ID && rate.display_name === 'GST' && rate.country === 'AU'))) throw new Error('Verified exclusive 10% GST rate is not configured.');
  return configuredId;
}

export async function retrieveWorldwideGstRate(stripe: { taxRates: { retrieve(id: string): Promise<any> } }, configuredId: unknown, livemode: boolean) {
  if (typeof configuredId !== 'string' || !/^txr_[A-Za-z0-9]+$/.test(configuredId)) throw new Error('Worldwide GST configuration is missing.');
  return validateWorldwideGstRate(await stripe.taxRates.retrieve(configuredId), configuredId, livemode);
}

/** Explicit manual rates, never dynamic_tax_rates or automatic_tax. */
export function worldwideGstLineItem<T extends Record<string, unknown>>(line: T, verifiedRateId: string) {
  if (!/^txr_[A-Za-z0-9]+$/.test(verifiedRateId)) throw new Error('Verified GST rate required.');
  if ('dynamic_tax_rates' in line || 'tax_rates' in line) throw new Error('Conflicting GST rates.');
  return { ...line, tax_rates: [verifiedRateId] };
}

export function validateWorldwideGstTotal(baseCents: number, quantity: number, percentOff: number, totalCents: unknown, taxCents: unknown) {
  const quote = worldwideGstAmounts(baseCents, quantity, percentOff);
  if (totalCents !== quote.totalCents || taxCents !== quote.taxCents) throw new Error('Verified checkout GST amount does not match policy.');
  return quote;
}
