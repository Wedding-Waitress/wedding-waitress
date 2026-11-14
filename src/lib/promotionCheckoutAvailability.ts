/** Enable only after sandbox fulfillment and live prerequisites are verified. */
export const PROMOTION_CHECKOUT_AVAILABLE = true;

export function checkoutAvailableForSelection(input: { purpose: string; plan: string; code: string; packagesEnabled: boolean; promotionsEnabled: boolean }) {
  if (!input.code.trim()) return input.packagesEnabled;
  return input.promotionsEnabled && input.purpose === 'new_plan'
    && ['essential', 'premium', 'unlimited'].includes(input.plan);
}
