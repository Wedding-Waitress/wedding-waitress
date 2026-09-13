export const ACCESS_EXTENSION_MONTH_PRICE_CENTS = 2_000
export const ACCESS_EXTENSION_MAX_MONTHS = 49_999
export const ACCESS_EXTENSION_PRICING_VERSION = 'aud_20_per_month_v1'

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
}

export const validatePaidAccessExtension = (evidence: PaidCheckoutEvidence) => {
  const months = parseAccessExtensionMonths(evidence.months)
  if (!months) return { ok: false as const, reason: 'duration' }
  const amountCents = accessExtensionAmountCents(months)
  if (evidence.paymentStatus !== 'paid') return { ok: false as const, reason: 'payment' }
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
