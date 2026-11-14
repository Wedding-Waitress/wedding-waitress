import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { publicProducts } from './publicProducts';
import { PUBLIC_COUPLE_PLAN_DETAILS } from '@/components/Pricing/pricingPlans';
import { gstInclusiveAud } from '@/lib/packagePricing';
import { publicOfferingsAuditRows, publicOfferingsAuditSources } from '@/i18n/publicOfferingsAuditCopy';
import { publicWorkflowRows } from '@/i18n/publicWorkflowCopy';

const terms = readFileSync('src/pages/TermsOfService.tsx', 'utf8');
describe('public current-offering consistency', () => {
  it('derives terms products and GST-inclusive amounts from the authoritative configuration', () => {
    expect(terms).toContain('publicProducts.map(product');
    expect(terms).toContain('Object.values(PUBLIC_COUPLE_PLAN_DETAILS)');
    expect(terms).toContain('gstInclusiveAud(plan.priceAud)');
    expect(publicProducts).toHaveLength(17);
    expect(Object.values(PUBLIC_COUPLE_PLAN_DETAILS).map(p => [p.guests,gstInclusiveAud(p.priceAud)])).toEqual([[100,218.9],[200,273.9],[400,328.9]]);
  });
  it('does not advertise legacy subscriptions, automatic retries or obsolete top-up charges', () => {
    for(const stale of ['both one-time purchase plans and monthly subscription plans','8.3 Monthly Subscriptions (Vendor Plans)','9.1 Cancelling Monthly Subscriptions','We will attempt to charge your card again','Additional packs of 100 Email & SMS credits may be purchased for A$49','Advertised Australian prices exclude GST'])expect(terms).not.toContain(stale);
    expect(terms).toContain(publicOfferingsAuditSources[1]);
    expect(terms).toContain(publicOfferingsAuditSources[4]);
    expect(terms).not.toContain('Cancel any active subscriptions first');
    expect(readFileSync('src/pages/Pricing.tsx','utf8')).toContain('<PricingValueComparison />');
  });
  it('corrects article access, sharing and PDF claims in every supported language', () => {
    for(const [language,copy] of Object.entries(publicOfferingsAuditRows)){
      expect(copy).toHaveLength(publicOfferingsAuditSources.length);
      const posts=JSON.parse(readFileSync(`src/i18n/locales/${language}/landing.json`,'utf8')).blog.posts;
      expect(posts['qr-code-wedding-seating-chart-australia'].sections[3].paragraphs).toEqual([copy[8],copy[9]]);
      expect(posts['why-every-wedding-needs-a-running-sheet'].sections[2].paragraphs[1]).toBe(copy[12]);
      expect(posts['last-minute-wedding-seating-changes'].sections[1].paragraphs[0]).toBe(copy[10]);
      expect(posts['wedding-signage-cost-australia'].intro).toBe(copy[8]);
      expect(posts['how-to-create-qr-code-seating-chart'].title).toBe(copy[16]);
      expect(posts['how-to-create-qr-code-seating-chart'].sections.slice(0,4).map(s=>s.paragraphs[0])).toEqual(publicWorkflowRows[language].slice(0,4));
    }
  });
});
