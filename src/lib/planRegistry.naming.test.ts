import {it,expect} from 'vitest';
import {PLAN_REGISTRY,getPlanByName,getWeddingPlanUpgrades} from './planRegistry';
import {PLAN_PRICES} from './stripePrices';
import {PLAN_DETAILS} from './upgradePlans';
it('shares exactly three public wedding package names and finite caps across status, picker and checkout',()=>{
 const tiers=getWeddingPlanUpgrades('Starter');
 expect(tiers.map(p=>[p.name,p.limits.guests])).toEqual([['Essential Plan',100],['Premium Plan',200],['Ultimate Plan',400]]);
 for(const key of ['essential','premium','unlimited'] as const){expect(PLAN_REGISTRY[key].name).toBe(PLAN_PRICES[key].name);expect(PLAN_DETAILS[key].name).toBe(PLAN_REGISTRY[key].name);expect(PLAN_REGISTRY[key].limits.guests).toBe(PLAN_PRICES[key].guest_limit);}
});
it.each(['Unlimited','Unlimited Plan','unlimited','Ultimate','Ultimate Plan','ultimate'])('recognises historical and current names without changing billing identity: %s',(name)=>{
 const plan=getPlanByName(name);expect(plan?.key).toBe('unlimited');expect(plan?.name).toBe('Ultimate Plan');expect(plan?.limits.guests).toBe(400);expect(plan?.plan_db_id).toBe('cd10f207-2109-4546-a635-0baa68ba8213');expect(plan?.product_id).toBe('ww_live_20260914_v2_unlimited');expect(plan?.prices.AUD.price_id).toBe(PLAN_PRICES.unlimited.price_id);expect(getWeddingPlanUpgrades(name)).toEqual([]);
});
it('keeps existing paid upgrade order and selectors',()=>{expect(getWeddingPlanUpgrades('Essential').map(p=>p.key)).toEqual(['premium','unlimited']);expect(getWeddingPlanUpgrades('Premium').map(p=>p.key)).toEqual(['unlimited']);});
