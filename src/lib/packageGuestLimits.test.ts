import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {PACKAGE_GUEST_LIMITS} from '../../supabase/functions/_shared/packageGuestLimits';
import {PUBLIC_COUPLE_PLAN_DETAILS} from '@/components/Pricing/pricingPlans';
import {PLAN_PRICES} from './stripePrices';
import {PLAN_REGISTRY} from './planRegistry';
import {promotionPreview} from '../../supabase/functions/_shared/promotionRules';
import {effectiveEventGuestLimit} from './guestEntitlement';
import {publicPlanFaqRows} from '@/i18n/publicPlanFaqCopy';

describe('approved paid package capacities',()=>{
 it.each([['essential',150,199,150],['premium',250,249,250],['unlimited',450,299,450]] as const)('%s agrees across public, dashboard and promotional checkout', (key,limit,price,credits)=>{
  expect(PACKAGE_GUEST_LIMITS[key]).toBe(limit);
  expect(PUBLIC_COUPLE_PLAN_DETAILS[key]).toMatchObject({guests:limit,priceAud:price,communicationCredits:credits});
  expect(PLAN_PRICES[key]).toMatchObject({guest_limit:limit,price_aud:price});
  expect(PLAN_REGISTRY[key].limits.guests).toBe(limit);
  expect(promotionPreview(key,50)).toMatchObject({guestLimit:limit,originalCents:price*100,includedCredits:credits});
  expect(promotionPreview(key,100)).toMatchObject({guestLimit:limit,subtotalCents:0,includedCredits:0});
  expect(effectiveEventGuestLimit({eventGuestLimit:limit,entitledGuestLimit:limit,isPlatformOwner:false})).toBe(limit);
  expect(effectiveEventGuestLimit({eventGuestLimit:limit+10,entitledGuestLimit:limit+10,isPlatformOwner:false})).toBe(limit+10);
 });
 it('retains the 20-guest trial and owner access',()=>{
  expect(effectiveEventGuestLimit({eventGuestLimit:450,entitledGuestLimit:450,isPlatformOwner:false,isTrial:true})).toBe(20);
  expect(effectiveEventGuestLimit({isPlatformOwner:true})).toBeNull();
 });
 it('updates all 13 translated capacity explanations without changing the trial',()=>{
  expect(Object.keys(publicPlanFaqRows)).toHaveLength(13);
  for(const row of Object.values(publicPlanFaqRows)){
   expect(row[11]).toMatch(/150/);expect(row[11]).toMatch(/250/);expect(row[11]).toMatch(/450/);expect(row[11]).toMatch(/20/);
  }
 });
 it('keeps the persisted migration aligned with the shared catalogue',()=>{
  const sql=readFileSync('supabase/migrations/20261115120000_increase_paid_package_guest_limits.sql','utf8');
  expect(sql).toContain("('Essential',100,150)");expect(sql).toContain("('Premium',200,250)");expect(sql).toContain("('Unlimited',400,450)");
  expect(sql).not.toMatch(/UPDATE\s+public\.(?:guests|rsvp_invite_purchases|user_subscriptions)/i);
 });
});
