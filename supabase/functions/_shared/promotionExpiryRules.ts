export const PROMOTION_EXPIRY_ZONE = 'Australia/Sydney';

export function promotionSydneyDate(now = Date.now()): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: PROMOTION_EXPIRY_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const get = (type: string) => parts.find(part => part.type === type)!.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** Date-only input. PostgreSQL alone derives the DST-aware exclusive boundary. */
export function validatePromotionExpiry(value: unknown, now = Date.now()): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Choose a valid expiry date or No expiry.');
  const parsed = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) throw new Error('Choose a valid expiry date.');
  if (value < promotionSydneyDate(now)) throw new Error('Expiry date cannot be before today in Australia/Sydney.');
  return value;
}

export function promotionExpiryLabel(date: string | null | undefined, expiresAt?: string | null, now = Date.now()): string {
  if (!date) return 'No expiry';
  const formatted = new Intl.DateTimeFormat('en-AU', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${date}T00:00:00Z`));
  const expired = expiresAt && Number.isFinite(Date.parse(expiresAt)) && now >= Date.parse(expiresAt);
  return `${expired ? 'Expired' : 'Expires'} ${formatted}, end of day (Australia/Sydney)`;
}
