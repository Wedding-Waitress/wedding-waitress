export const PROMOTION_AUDIENCES = ['general', 'customer', 'venue_partner'] as const;
export type PromotionAudience = typeof PROMOTION_AUDIENCES[number];

/** Validate request shape; account existence and redemption eligibility stay in SQL. */
export function validatePromotionAudience(input: Record<string, unknown>) {
  if (!PROMOTION_AUDIENCES.includes(input.audience as PromotionAudience)) throw new Error('Choose a promotion audience.');
  if (typeof input.usage_limit !== 'number' || !Number.isInteger(input.usage_limit) || input.usage_limit < 0 || input.usage_limit > 100) {
    throw new Error('Choose a whole usage limit from 0 to 100. Zero allows no redemptions.');
  }
  const bound = input.bound_account_id ?? null;
  if (input.audience === 'general' ? bound !== null : typeof bound !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bound)) {
    throw new Error('Confirm the existing account for this audience.');
  }
  return { audience: input.audience as PromotionAudience, usage_limit: input.usage_limit, bound_account_id: bound as string | null };
}

export function promotionAccountSearchEmail(value: unknown) {
  if (typeof value !== 'string') throw new Error('Enter the complete account email.');
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter the complete account email.');
  return email;
}
