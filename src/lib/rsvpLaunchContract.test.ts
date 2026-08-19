import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');
const prices = read('src/lib/stripePrices.ts');
const activation = read('src/components/Dashboard/RsvpActivationModal.tsx');
const checkout = read('supabase/functions/create-checkout/index.ts');
const verification = read('supabase/functions/verify-payment/index.ts');

describe('launch RSVP purchase contract', () => {
  it('keeps the approved A$100 bundle with 400 included SMS invitations', () => {
    expect(prices).toMatch(/min:\s*1,\s*max:\s*100,\s*price_aud:\s*100/);
    expect(checkout).toContain('if (isBaseRsvp) originalAmountCents = 10000');
    expect(verification).toContain('const SMS_INCLUDED_CREDITS = 400');
    expect(activation).toContain("'400 SMS Credits Included'");
    expect(activation).toContain('Includes 400 SMS credits + unlimited email invitations.');
  });

  it('keeps the existing A$99 top-up at 250 SMS credits', () => {
    expect(prices).toMatch(/SMS_TOPUP[\s\S]*price_aud:\s*99[\s\S]*credits:\s*250/);
    expect(verification).toContain('const SMS_TOPUP_CREDITS = 250');
  });

  it('has no referral-dependent checkout or payment verification behavior', () => {
    expect(checkout).not.toMatch(/referral_reward|referral attribution/i);
    expect(verification).not.toMatch(/referral_reward|record_referral|reverse_referral/i);
  });
});
