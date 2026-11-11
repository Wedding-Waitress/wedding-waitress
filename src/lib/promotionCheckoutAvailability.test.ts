import { expect, it } from 'vitest';
import { checkoutAvailableForSelection, PROMOTION_CHECKOUT_AVAILABLE } from './promotionCheckoutAvailability';
const input = { purpose: 'new_plan', plan: 'essential', code: 'OFFER', packagesEnabled: false, promotionsEnabled: true };
it('enables the owner-authorized verified promotion release', () => { expect(PROMOTION_CHECKOUT_AVAILABLE).toBe(true); });
it.each(['essential', 'premium', 'unlimited'])('can enable only a coded first purchase of %s while general checkout stays closed', plan => {
 expect(checkoutAvailableForSelection({...input, plan})).toBe(true);
});
it.each([{purpose:'renewal'}, {purpose:'upgrade'}, {plan:'vendor_pro'}, {code:'  '}, {promotionsEnabled:false}])('keeps unrelated or disabled checkout closed: %j', change => {
 expect(checkoutAvailableForSelection({...input,...change})).toBe(false);
});
it('general checkout activation does not activate promotional checkout', () => {
 expect(checkoutAvailableForSelection({...input, packagesEnabled:true, promotionsEnabled:false})).toBe(false);
 expect(checkoutAvailableForSelection({...input, packagesEnabled:true, promotionsEnabled:false, code:''})).toBe(true);
});
