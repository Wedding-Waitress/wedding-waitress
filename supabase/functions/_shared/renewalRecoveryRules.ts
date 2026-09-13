/** A request-shape filter, NOT authorization. Only later verified server state
 * can authorize the minimal billing recovery route. Never permits add-ons.
 */
export function isMinimalConsentedRenewalRequest(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const body = value as Record<string, unknown>;
  return typeof body.plan_type === 'string' && ['essential', 'premium', 'unlimited'].includes(body.plan_type)
    && body.purchase_consent === true && body.plan_purchase_purpose === 'renewal'
    && body.pricing_currency === 'AUD' && (!body.mode || body.mode === 'payment')
    && (body.quantity === undefined || body.quantity === 1) && !body.purchase_type
    && !body.event_id && !body.upgrade_from_plan;
}

export function isVerifiedClosedRenewalDecision(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return row.account_closed === true && row.admin_blocked === false
    && row.renewal_required === true && row.can_reopen === false
    && typeof row.server_now === 'string' && Number.isFinite(Date.parse(row.server_now));
}
