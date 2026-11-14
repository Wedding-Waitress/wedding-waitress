
export const COMMUNICATION_TOPUP_PLAN_IDS = new Set([
  '78cdab0d-d81d-4757-b7cc-f210b8b30f47',
  '1c2c595d-e01b-4bd7-ad8e-f9d6cda0b2c8',
  'cd10f207-2109-4546-a635-0baa68ba8213',
]);
export const TOPUP_PLAN_REQUIRED = 'Credit top-ups require an active Essential, Premium or Ultimate plan.';
export type TopupEligibility = { status: 'loading' | 'eligible' | 'ineligible' | 'error'; message: string };
export const TOPUP_CHECKING: TopupEligibility = { status: 'loading', message: 'Checking credit purchase eligibility…' };
export function isCommunicationTopupSubscriptionCurrent(subscription: {plan_id: string; status: string; is_read_only: boolean | null; expires_at: string | null} | null, now = Date.now()) {
  return !!subscription && COMMUNICATION_TOPUP_PLAN_IDS.has(subscription.plan_id)
    && ['active', 'trialing', 'grace_period'].includes(subscription.status)
    && subscription.is_read_only !== true
    && (!subscription.expires_at || new Date(subscription.expires_at).getTime() >= now);
}
