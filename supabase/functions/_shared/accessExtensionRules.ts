export const ACCESS_EXTENSION_MONTH_PRICE_CENTS = 2_000
export const ACCESS_EXTENSION_MAX_MONTHS = 49_999
export const ACCESS_EXTENSION_PRICING_VERSION = 'aud_20_per_month_v1'
export const ACCESS_EXTENSION_GST_PRICING_VERSION = 'aud_20_plus_worldwide_gst_v2'
export const ACCESS_EXTENSION_GST_MAX_MONTHS = 45_454
export const ACCESS_EXTENSION_LIVE_PRICE_ID = 'price_1UFTrF5GzTmqOxGK1ueAxUAi'
export const ACCESS_EXTENSION_LIVE_PRODUCT_ID = 'ww_live_20260914_v2_access_extension_month'

export const parseAccessExtensionMonths = (value: unknown) => {
  const months = Number(value)
  if (!Number.isSafeInteger(months) || months < 1 || months > ACCESS_EXTENSION_MAX_MONTHS) return null
  return months
}

export const accessExtensionAmountCents = (months: number) => months * ACCESS_EXTENSION_MONTH_PRICE_CENTS

export interface PaidCheckoutEvidence {
  months: unknown
  metadataAmount: unknown
  pricingVersion: unknown
  productPurchaseType: unknown
  paymentStatus: unknown
  currency: unknown
  amountTotal: unknown
  lineCurrency: unknown
  lineUnitAmount: unknown
  lineQuantity: unknown
  linePriceId?: unknown
  lineProductId?: unknown
  amountSubtotal?: unknown
  amountTax?: unknown
  amountDiscount?: unknown
  amountShipping?: unknown
  sessionComplete?: unknown
  sessionLive?: unknown
  lineCount?: unknown
  linesHasMore?: unknown
}

export const validatePaidAccessExtension = (evidence: PaidCheckoutEvidence) => {
  const months = parseAccessExtensionMonths(evidence.months)
  if (!months) return { ok: false as const, reason: 'duration' }
  const amountCents = accessExtensionAmountCents(months)
  if (evidence.paymentStatus !== 'paid') return { ok: false as const, reason: 'payment' }
  if (evidence.pricingVersion === ACCESS_EXTENSION_GST_PRICING_VERSION) {
    const taxCents = months * 200
    if (months > ACCESS_EXTENSION_GST_MAX_MONTHS || evidence.metadataAmount !== String(amountCents)
      || evidence.currency !== 'aud' || evidence.lineCurrency !== 'aud'
      || evidence.linePriceId !== ACCESS_EXTENSION_LIVE_PRICE_ID || evidence.lineProductId !== ACCESS_EXTENSION_LIVE_PRODUCT_ID
      || evidence.lineUnitAmount !== 2000 || evidence.lineQuantity !== months
      || evidence.amountSubtotal !== amountCents || evidence.amountTax !== taxCents
      || evidence.amountTotal !== amountCents + taxCents || evidence.amountDiscount !== 0 || evidence.amountShipping !== 0
      || evidence.sessionComplete !== true || evidence.sessionLive !== true
      || evidence.lineCount !== 1 || evidence.linesHasMore !== false) return { ok: false as const, reason: 'catalogue' }
    return { ok: true as const, months, amountCents, taxCents, totalCents: amountCents + taxCents }
  }
  if (evidence.pricingVersion !== ACCESS_EXTENSION_PRICING_VERSION || evidence.metadataAmount !== String(amountCents)) {
    return { ok: false as const, reason: 'metadata' }
  }
  if (evidence.productPurchaseType !== 'access_extension' || evidence.currency !== 'aud' ||
      evidence.lineCurrency !== 'aud' || evidence.amountTotal !== amountCents ||
      evidence.lineUnitAmount !== amountCents || evidence.lineQuantity !== 1) {
    return { ok: false as const, reason: 'catalogue' }
  }
  return { ok: true as const, months, amountCents }
}

export const addCalendarMonths = (input: Date, months: number) => {
  const result = new Date(input)
  const originalDay = result.getUTCDate()
  result.setUTCDate(1)
  result.setUTCMonth(result.getUTCMonth() + months)
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate()
  result.setUTCDate(Math.min(originalDay, lastDay))
  return result
}

export const calculateExtendedExpiry = (currentExpiry: Date, paidAt: Date, months: number) =>
  addCalendarMonths(currentExpiry > paidAt ? currentExpiry : paidAt, months)

export const calculateRecoveryDeadline = (expiresAt: Date) => addCalendarMonths(expiresAt, 6)

export const isThirtyDayReminderDue = (now: Date, expiresAt: Date) => {
  const remaining = expiresAt.getTime() - now.getTime()
  return remaining > (30 * 24 - 1) * 60 * 60 * 1000 && remaining <= 30 * 24 * 60 * 60 * 1000
}
