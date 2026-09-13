/** Pure rules shared by offer previews and the server. Never an authorization boundary. */
export const PROMOTION_PLANS = {
  essential: { amountCents: 19900, credits: 150, guests: 100 },
  premium: { amountCents: 24900, credits: 250, guests: 200 },
  unlimited: { amountCents: 29900, credits: 450, guests: 400 },
} as const;
export type PromotionPlan = keyof typeof PROMOTION_PLANS;

export function normalizePromotionCode(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Enter a promo code.');
  const code = value.trim().toUpperCase();
  // Manual names including spaces and % are supported; HTML/control characters are not.
  if (!/^[A-Z0-9][A-Z0-9 %_-]{0,63}$/.test(code)) throw new Error('Use 1–64 letters, numbers, spaces, %, hyphens or underscores.');
  return code;
}

export function validatePromotionPercent(value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 100) {
    throw new Error('Discount must be a whole percentage from 1 to 100.');
  }
  return value;
}

export function promotionPreview(planKey: PromotionPlan, percent: number) {
  const plan = PROMOTION_PLANS[planKey];
  if (!plan) throw new Error('Choose Essential, Premium or Ultimate.');
  validatePromotionPercent(percent);
  const discountCents = Math.round(plan.amountCents * percent / 100);
  return {
    originalCents: plan.amountCents, discountCents,
    subtotalCents: plan.amountCents - discountCents,
    includedCredits: percent <= 50 ? plan.credits : 0,
    guestLimit: plan.guests, currency: 'AUD' as const,
  };
}

export function requireFirstPromotionPurchase(purpose: unknown, hasPreviousPurchase: boolean) {
  if (purpose !== 'new_plan' || hasPreviousPurchase) throw new Error('Promo codes apply only to your first package purchase.');
}

export function promotionTermStart(completedAt: string, originalTrialEndsAt: string): string {
  const completed = Date.parse(completedAt);
  const trialEnd = Date.parse(originalTrialEndsAt);
  if (!Number.isFinite(completed) || !Number.isFinite(trialEnd)) throw new Error('Verified completion and original trial expiry are required.');
  return new Date(Math.max(completed, trialEnd)).toISOString();
}

export function promotionTermEnd(startsAt: string): string {
  const start = new Date(startsAt);
  if (!Number.isFinite(start.getTime())) throw new Error('A valid access start is required.');
  const end = new Date(start);
  const day = start.getUTCDate(), month = start.getUTCMonth();
  end.setUTCDate(1);
  end.setUTCFullYear(start.getUTCFullYear() + 1);
  end.setUTCDate(Math.min(day, new Date(Date.UTC(end.getUTCFullYear(), month + 1, 0)).getUTCDate()));
  return end.toISOString();
}

export interface PromotionCompletionEvidence {
  status: string; paymentStatus: string; currency: string;
  subtotalCents: number; totalCents: number; discountCents: number;
  paymentIntentId: string | null; percent: number; plan: PromotionPlan;
  couponId: string; expectedCouponId: string;
}

/** Call only with retrieved provider objects and a stored, immutable server quote. */
export function validatePromotionCompletion(evidence: PromotionCompletionEvidence) {
  const quote = promotionPreview(evidence.plan, evidence.percent);
  if (evidence.status !== 'complete' || evidence.currency.toUpperCase() !== 'AUD'
    || !evidence.expectedCouponId || evidence.couponId !== evidence.expectedCouponId
    || evidence.subtotalCents !== quote.originalCents || evidence.discountCents !== quote.discountCents
    || !Number.isSafeInteger(evidence.totalCents) || evidence.totalCents < quote.subtotalCents) {
    throw new Error('Checkout does not match the approved promotional quote.');
  }
  if (evidence.percent === 100) {
    if (evidence.totalCents !== 0 || evidence.paymentStatus !== 'no_payment_required' || evidence.paymentIntentId !== null) throw new Error('A completed no-cost checkout is required.');
  } else if (evidence.paymentStatus !== 'paid' || !/^pi_[A-Za-z0-9]+$/.test(evidence.paymentIntentId ?? '')) {
    throw new Error('A verified successful discounted payment is required.');
  }
  return quote;
}
