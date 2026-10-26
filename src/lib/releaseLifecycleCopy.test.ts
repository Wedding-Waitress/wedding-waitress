import {describe,it,expect} from 'vitest';
import fs from 'node:fs';

describe('released renewal and retained-content wording',()=>{
  it('does not promise excluded monthly extensions or automatic expiry deletion',()=>{
    const terms=fs.readFileSync('src/pages/TermsOfService.tsx','utf8');
    const card=fs.readFileSync('src/components/Account/SubscriptionCard.tsx','utf8');
    const pricing=fs.readFileSync('src/pages/Pricing.tsx','utf8');
    const comparison=fs.readFileSync('src/components/Pricing/PricingValueComparison.tsx','utf8');
    expect(terms).not.toContain('recoverable account content is permanently removed after the recovery deadline');
    expect(terms).not.toContain('Extensions cost A$20');
    expect(terms).toContain('Expiry alone does not automatically delete');
    expect(terms).toContain('a promotional package purchased during the free trial starts after that trial ends');
    expect(terms).toContain('renewal requires your explicit package selection and successful checkout');
    expect(card).toContain('const canExtend = false;');
    expect(pricing).not.toContain('A$20 per month');
    expect(pricing).not.toContain('recoverable content are permanently removed');
    expect(comparison).not.toContain('A$20 per prepaid month');
  });
});
