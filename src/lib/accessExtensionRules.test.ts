import { describe, expect, it } from 'vitest'
import {
  ACCESS_EXTENSION_MAX_MONTHS,
  accessExtensionAmountCents,
  addCalendarMonths,
  calculateExtendedExpiry,
  calculateRecoveryDeadline,
  isThirtyDayReminderDue,
  parseAccessExtensionMonths,
  validatePaidAccessExtension,
  ACCESS_EXTENSION_GST_PRICING_VERSION,
  ACCESS_EXTENSION_LIVE_PRICE_ID,
  ACCESS_EXTENSION_LIVE_PRODUCT_ID,
} from '../../supabase/functions/_shared/accessExtensionRules'

describe('access extension payment rules', () => {
  it('requires exact live monthly SKU and GST evidence without changing historical verification', () => {
    const valid = { months: 6, metadataAmount: '12000', pricingVersion: ACCESS_EXTENSION_GST_PRICING_VERSION,
      paymentStatus: 'paid', currency: 'aud', amountTotal: 13200, amountSubtotal: 12000, amountTax: 1200,
      amountDiscount: 0, amountShipping: 0, lineCurrency: 'aud', lineUnitAmount: 2000, lineQuantity: 6,
      linePriceId: ACCESS_EXTENSION_LIVE_PRICE_ID, lineProductId: ACCESS_EXTENSION_LIVE_PRODUCT_ID,
      productPurchaseType: 'access_extension', sessionComplete: true, sessionLive: true, lineCount: 1, linesHasMore: false };
    expect(validatePaidAccessExtension(valid)).toEqual({ ok: true, months: 6, amountCents: 12000, taxCents: 1200, totalCents: 13200 });
    for (const patch of [{ amountTax: 0 }, { amountTotal: 12000 }, { lineQuantity: 1 }, { linePriceId: 'price_Foreign' },
      { lineProductId: 'prod_Foreign' }, { sessionComplete: false }, { sessionLive: false }, { linesHasMore: true },
      { lineCount: 2 }, { amountDiscount: 100 }, { metadataAmount: '13200' }]) {
      expect(validatePaidAccessExtension({ ...valid, ...patch }).ok).toBe(false);
    }
  });
  it.each([
    [1, 2_000],
    [7, 14_000],
    [12, 24_000],
    [37, 74_000],
  ])('prices %i whole months at A$20 per month', (months, cents) => {
    expect(parseAccessExtensionMonths(months)).toBe(months)
    expect(accessExtensionAmountCents(months)).toBe(cents)
  })

  it.each([0, -1, 1.5, '1.5', ACCESS_EXTENSION_MAX_MONTHS + 1, Number.NaN])(
    'rejects invalid duration %s',
    (months) => expect(parseAccessExtensionMonths(months)).toBeNull(),
  )

  it('accepts only exact paid Stripe evidence', () => {
    const valid = {
      months: 6,
      metadataAmount: '12000',
      pricingVersion: 'aud_20_per_month_v1',
      productPurchaseType: 'access_extension',
      paymentStatus: 'paid',
      currency: 'aud',
      amountTotal: 12_000,
      lineCurrency: 'aud',
      lineUnitAmount: 12_000,
      lineQuantity: 1,
    }
    expect(validatePaidAccessExtension(valid)).toEqual({ ok: true, months: 6, amountCents: 12_000 })
    for (const [field, value] of [
      ['metadataAmount', '11999'],
      ['pricingVersion', 'legacy'],
      ['productPurchaseType', 'other'],
      ['paymentStatus', 'unpaid'],
      ['currency', 'usd'],
      ['amountTotal', 11_999],
      ['lineCurrency', 'usd'],
      ['lineUnitAmount', 2_000],
      ['lineQuantity', 6],
    ] as const) {
      expect(validatePaidAccessExtension({ ...valid, [field]: value }).ok).toBe(false)
    }
  })
})

describe('access extension calendar rules', () => {
  it('extends active access from its current expiry', () => {
    expect(calculateExtendedExpiry(new Date('2027-09-05T12:00:00Z'), new Date('2027-04-01T12:00:00Z'), 3).toISOString())
      .toBe('2027-12-05T12:00:00.000Z')
  })

  it('restarts expired access from the successful payment time', () => {
    expect(calculateExtendedExpiry(new Date('2027-01-01T00:00:00Z'), new Date('2027-04-15T09:30:00Z'), 2).toISOString())
      .toBe('2027-06-15T09:30:00.000Z')
  })

  it('clamps calendar-month additions to the target month end', () => {
    expect(addCalendarMonths(new Date('2027-01-31T08:00:00Z'), 1).toISOString()).toBe('2027-02-28T08:00:00.000Z')
    expect(calculateRecoveryDeadline(new Date('2027-08-31T08:00:00Z')).toISOString()).toBe('2028-02-29T08:00:00.000Z')
  })

  it('queues the reminder only in the one-hour window ending 30 days before expiry', () => {
    const expiry = new Date('2027-12-31T00:00:00Z')
    expect(isThirtyDayReminderDue(new Date('2027-12-01T00:00:00Z'), expiry)).toBe(true)
    expect(isThirtyDayReminderDue(new Date('2027-11-30T23:59:59Z'), expiry)).toBe(false)
    expect(isThirtyDayReminderDue(new Date('2027-12-01T01:00:00Z'), expiry)).toBe(false)
  })
})
