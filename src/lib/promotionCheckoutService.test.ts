import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPromotionCheckout, type PromotionCheckoutDependencies } from '../../supabase/functions/_shared/promotionCheckoutService';
describe('promotional Checkout creation', () => {
  let deps: PromotionCheckoutDependencies;
  const input = { userId: 'user-fixture', verifiedEmail: 'verified@example.test', code: 'VENUE51', plan: 'essential' as const,
    consent: true, returnOrigin: 'http://localhost:8080', livemode: false, taxRegistrationVerified: true };
  const reservation = { id: '11111111-1111-4111-8111-111111111111', percent_off: 51, included_credits: 0, plan_key: 'essential' as const, stripe_session_id: null };
  const recordedMetadata = { promotion_version: '1', promotion_reservation_id: reservation.id, user_id: input.userId,
    plan_type: input.plan, plan_purchase_purpose: 'new_plan', purchase_consent: 'explicit-v1' };
  beforeEach(() => { deps = { reserve: vi.fn().mockResolvedValue(reservation), ensureCustomer: vi.fn().mockResolvedValue('cus_fixture'),
    ensureCoupon: vi.fn().mockResolvedValue('coupon_fixture'), retrieveSession: vi.fn(), verifyRecordedSession: vi.fn().mockResolvedValue(undefined),
    createSession: vi.fn().mockResolvedValue({ id: 'cs_fixture', client_secret: 'fixture-only', customer: 'cus_fixture', livemode: false }), bind: vi.fn().mockResolvedValue(undefined) }; });
  it('reserves, applies the exact percentage and binds before returning', async () => {
    const result = await createPromotionCheckout(deps, input);
    expect(result.quote.includedCredits).toBe(0);
    expect(deps.ensureCustomer).toHaveBeenCalledWith('user-fixture', 'verified@example.test');
    expect(deps.ensureCoupon).toHaveBeenCalledWith(`ww-promotion-${reservation.id}`, 51, 'prod_UOQhHcOhFdrhOs');
    expect(deps.createSession).toHaveBeenCalledWith(expect.objectContaining({ discounts: [{ coupon: 'coupon_fixture' }], mode: 'payment', return_url: 'http://localhost:8080/payment-success?promotion=1&session_id={CHECKOUT_SESSION_ID}' }), `ww-promotion-checkout:${reservation.id}`);
    expect(deps.bind).toHaveBeenCalledWith(reservation.id, 'cs_fixture', 'cus_fixture', 'prod_UOQhHcOhFdrhOs', 'coupon_fixture', false);
  });
  it('never exposes an unbound checkout', async () => {
    vi.mocked(deps.bind).mockRejectedValue(new Error('binding unavailable'));
    await expect(createPromotionCheckout(deps, input)).rejects.toThrow('binding unavailable');
  });
  it('rejects missing consent before any provider work', async () => {
    await expect(createPromotionCheckout(deps, { ...input, consent: false })).rejects.toThrow(); expect(deps.reserve).not.toHaveBeenCalled();
  });
  it('rejects unverified tax setup before any provider work', async () => {
    await expect(createPromotionCheckout(deps, { ...input, taxRegistrationVerified: false })).rejects.toThrow(); expect(deps.reserve).not.toHaveBeenCalled();
  });
  it('does not allow redirecting checkout to an arbitrary website', async () => {
    await expect(createPromotionCheckout(deps, { ...input, returnOrigin: 'https://other.example' })).rejects.toThrow(); expect(deps.createSession).not.toHaveBeenCalled();
  });
  it('reopens the stored checkout instead of creating another', async () => {
    vi.mocked(deps.reserve).mockResolvedValue({ ...reservation, stripe_session_id: 'cs_previous' });
    vi.mocked(deps.retrieveSession).mockResolvedValue({ id: 'cs_previous', client_secret: 'fixture-only', status: 'open', livemode: false, mode: 'payment',
      metadata: recordedMetadata });
    expect((await createPromotionCheckout(deps, input)).session.id).toBe('cs_previous');
    expect(deps.createSession).not.toHaveBeenCalled(); expect(deps.ensureCustomer).not.toHaveBeenCalled();
    expect(deps.verifyRecordedSession).toHaveBeenCalledWith(expect.objectContaining({ id: 'cs_previous' }), expect.objectContaining({ id: reservation.id }), input.userId);
  });
  it('never exposes a recorded checkout when binding verification is uncertain', async () => {
    vi.mocked(deps.reserve).mockResolvedValue({ ...reservation, stripe_session_id: 'cs_previous' });
    vi.mocked(deps.retrieveSession).mockResolvedValue({ id: 'cs_previous', client_secret: 'fixture-only', status: 'open', mode: 'payment', livemode: false, metadata: recordedMetadata });
    vi.mocked(deps.verifyRecordedSession).mockRejectedValue(new Error('binding unavailable'));
    await expect(createPromotionCheckout(deps, input)).rejects.toThrow('binding unavailable');
    expect(deps.createSession).not.toHaveBeenCalled();
  });
  it('does not silently recycle an expired checkout', async () => {
    vi.mocked(deps.reserve).mockResolvedValue({ ...reservation, stripe_session_id: 'cs_previous' });
    vi.mocked(deps.retrieveSession).mockResolvedValue({ id: 'cs_previous', status: 'expired', livemode: false,
      metadata: { promotion_reservation_id: reservation.id, user_id: input.userId } });
    await expect(createPromotionCheckout(deps, input)).rejects.toThrow('reconciled'); expect(deps.createSession).not.toHaveBeenCalled();
  });
  it('creates a new attempt only after confirmed unpaid expiry is archived',async()=>{
    vi.mocked(deps.reserve).mockResolvedValueOnce({...reservation,stripe_session_id:'cs_previous',attempt_number:0}).mockResolvedValueOnce({...reservation,attempt_number:1});
    vi.mocked(deps.retrieveSession).mockResolvedValue({id:'cs_previous',status:'expired',payment_status:'unpaid',payment_intent:null,mode:'payment',customer:'cus_fixture',livemode:false,
      metadata:recordedMetadata});
    deps.reconcileExpired=vi.fn().mockResolvedValue(undefined);
    await createPromotionCheckout(deps,input);
    expect(deps.reconcileExpired).toHaveBeenCalled();
    expect(deps.ensureCoupon).toHaveBeenCalledWith(`ww-promotion-${reservation.id}:1`,51,'prod_UOQhHcOhFdrhOs');
    expect(deps.createSession).toHaveBeenCalledWith(expect.anything(),`ww-promotion-checkout:${reservation.id}:1`);
  });
  it('never retries an expired checkout that has payment evidence',async()=>{
    vi.mocked(deps.reserve).mockResolvedValue({...reservation,stripe_session_id:'cs_previous'});
    vi.mocked(deps.retrieveSession).mockResolvedValue({id:'cs_previous',status:'expired',payment_status:'unpaid',payment_intent:'pi_uncertain',mode:'payment',customer:'cus_fixture',livemode:false,
      metadata:recordedMetadata});
    deps.reconcileExpired=vi.fn();
    await expect(createPromotionCheckout(deps,input)).rejects.toThrow('reconciled');
    expect(deps.reconcileExpired).not.toHaveBeenCalled();expect(deps.createSession).not.toHaveBeenCalled();
  });
  it.each([
    { plan_type: 'premium' }, { plan_purchase_purpose: 'renewal' },
    { purchase_consent: undefined }, { promotion_version: '2' }, { user_id: 'other-account' },
  ])('rejects substituted recorded checkout metadata: %j', async (metadataChange) => {
    vi.mocked(deps.reserve).mockResolvedValue({ ...reservation, stripe_session_id: 'cs_previous' });
    vi.mocked(deps.retrieveSession).mockResolvedValue({ id: 'cs_previous', client_secret: 'fixture-only', status: 'open', mode: 'payment',
      livemode: false, metadata: { ...recordedMetadata, ...metadataChange } });
    await expect(createPromotionCheckout(deps, input)).rejects.toThrow('reconciled');
    expect(deps.createSession).not.toHaveBeenCalled();
    expect(deps.ensureCustomer).not.toHaveBeenCalled();
  });
  it.each([null, { id: 'cs_previous', status: 'open', mode: 'subscription', livemode: false, metadata: recordedMetadata }])(
    'fails closed for missing or wrong-mode recorded checkout', async (previous) => {
      vi.mocked(deps.reserve).mockResolvedValue({ ...reservation, stripe_session_id: 'cs_previous' });
      vi.mocked(deps.retrieveSession).mockResolvedValue(previous);
      await expect(createPromotionCheckout(deps, input)).rejects.toThrow('reconciled');
      expect(deps.createSession).not.toHaveBeenCalled();
    });
});
