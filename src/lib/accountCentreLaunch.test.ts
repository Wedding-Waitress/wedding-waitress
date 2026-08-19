import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
const read=(path:string)=>readFileSync(path,'utf8');
const planBilling=read('src/components/Account/PlanBillingSection.tsx');
const subscription=read('src/components/Account/SubscriptionCard.tsx');
const history=read('src/components/Account/HistoryCard.tsx');
const accountCss=read('src/pages/Account.module.css');

describe('Account Centre launch contract',()=>{
  it('merges plan, billing and real invoice history on one routed destination',()=>{
    expect(planBilling).toContain('<SubscriptionCard');
    expect(planBilling).toContain('<BillingCard');
    expect(planBilling).toContain('<HistoryCard');
    expect(history).toContain('data.history');
    expect(history).toContain('Invoices & Payment History');
    expect(history).toContain('row.hostedUrl');
  });
  it('keeps Change Plan routed to Plans & Upgrades',()=>{
    expect(subscription).toContain("navigate('/account/plans-upgrades')");
    expect(subscription).toContain('Change Plan');
  });
  it('retains tablet, mobile, keyboard and reduced-motion behavior',()=>{
    expect(accountCss).toContain('@media (max-width: 1023px)');
    expect(accountCss).toContain('@media (max-width: 639px)');
    expect(accountCss).toContain(':focus-visible');
    expect(accountCss).toContain('@media (prefers-reduced-motion: reduce)');
  });
});
