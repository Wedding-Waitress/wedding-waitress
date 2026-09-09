import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const checkout = readFileSync('supabase/functions/create-checkout/index.ts', 'utf8');
const verification = readFileSync('supabase/functions/verify-payment/index.ts', 'utf8');
const migration = readFileSync('supabase/migrations/20260909154000_additional_event_payment_hardening.sql', 'utf8');
const eventsUi = readFileSync('src/components/Dashboard/EventsTable.tsx', 'utf8');

describe('additional-event paid-plan contract', () => {
  it('requires a current paid wedding plan before opening checkout', () => {
    expect(checkout).toContain("purchase_type === 'additional_event'");
    expect(checkout).toContain('PAID_WEDDING_PLAN_IDS.has(subscription.plan_id)');
    expect(checkout).toContain('subscription.is_read_only !== true');
    expect(checkout).toContain("An existing current Essential, Premium or Ultimate plan is required");
  });

  it('accepts only the approved product and currency-specific price mapping', () => {
    expect(checkout).toContain("const ADDITIONAL_EVENT_PRODUCT_ID = 'prod_UTm7byFGV7E127'");
    expect(checkout).toContain('price_1TUoZ15GzTmqOxGKDRmvofDh');
    expect(checkout).toContain("{ currency: 'aud', unitAmount: 9900 }");
    expect(verification).toContain('lineItem.price.unit_amount !== allowed.unitAmount');
  });

  it('fulfills one slot once and refuses unpaid verification globally', () => {
    expect(verification).toContain('session.payment_status !== "paid"');
    expect(verification).toContain("fulfill_additional_event_purchase");
    expect(migration).toContain('uq_additional_event_purchases_stripe_session');
    expect(migration).toContain('pg_advisory_xact_lock');
    expect(migration).toContain("'already_fulfilled'");
  });

  it('keeps the purchase UI behind the authoritative paid-plan allowance', () => {
    expect(eventsUi).toContain('eventLimits.canPurchaseAdditionalEvents && eventLimits.canCreate');
    expect(eventsUi).toContain('eventLimits.canPurchaseAdditionalEvents && <AdditionalEventModal');
  });
});
