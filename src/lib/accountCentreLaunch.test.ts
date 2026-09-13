import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
const read=(path:string)=>readFileSync(path,'utf8');
const planBilling=read('src/components/Account/PlanBillingSection.tsx');
const subscription=read('src/components/Account/SubscriptionCard.tsx');
const history=read('src/components/Account/HistoryCard.tsx');
const accountCss=read('src/pages/Account.module.css');
const app=read('src/App.tsx');

describe('Account Centre launch contract',()=>{
  it('merges plan, billing and real invoice history on one routed destination',()=>{
    expect(planBilling).toContain('<SubscriptionCard');
    expect(planBilling).toContain('<BillingCard');
    expect(planBilling).toContain('<HistoryCard');
    expect(history).toContain('data.history');
    expect(history).toContain('Invoices & Payment History');
    expect(history).toContain('row.hostedUrl');
  });
  it('removes the retired plan-change destination from Current Plan',()=>{
    expect(subscription).not.toContain("navigate('/account/plans-upgrades')");
    expect(subscription).not.toContain('Change Plan');
  });
  it('retains tablet, mobile, keyboard and reduced-motion behavior',()=>{
    expect(accountCss).toContain('@media (max-width: 1023px)');
    expect(accountCss).toContain('@media (max-width: 639px)');
    expect(accountCss).toContain(':focus-visible');
    expect(accountCss).toContain('@media (prefers-reduced-motion: reduce)');
  });
  it('uses the approved dashboard loading treatment while the Account Centre route chunk opens',()=>{
    expect(app).toContain("pathname.startsWith('/dashboard') || isAccountCentre");
    expect(app).toContain("appearance={isAccountCentre ? 'core'");
    expect(app).toContain("title={isAccountCentre ? 'Opening Account Centre…'");
  });
});
