/**
 * Access extensions are one-time, prepaid purchases at A$20 per whole month.
 * Stripe accepts amounts up to eight digits in the smallest currency unit, so
 * 45,454 months is the limit at 2,200 cents per month including 10% GST.
 */
export const ACCESS_EXTENSION_MONTHLY_PRICE_AUD = 20;
export const ACCESS_EXTENSION_MONTHLY_PRICE_CENTS = 2_000;
export const ACCESS_EXTENSION_MAX_MONTHS = 45_454;

export interface ExtensionOption {
  months: number;
  label: string;
  price_aud: number;
}

export const calculateExtensionPriceAud = (months: number) =>
  months * ACCESS_EXTENSION_MONTHLY_PRICE_AUD;

/** Consumer total; base calculations remain available for historical receipts. */
export const calculateExtensionTotalAud = (months: number) => months * 22;

export const isValidExtensionMonths = (months: number) =>
  Number.isSafeInteger(months) && months >= 1 && months <= ACCESS_EXTENSION_MAX_MONTHS;

export const createExtensionOption = (months: number): ExtensionOption => ({
  months,
  label: `${months} ${months === 1 ? 'Month' : 'Months'}`,
  price_aud: calculateExtensionPriceAud(months),
});

export const DEFAULT_EXTENSION_MONTHS = [1, 2, 3, 4, 5, 6, 12] as const;
export const DEFAULT_EXTENSION_OPTIONS = DEFAULT_EXTENSION_MONTHS.map(createExtensionOption);

export const normalizePublicPlanName = (planName: string) =>
  planName.replace(/^unlimited(?=\s|$)/i, 'Ultimate');
