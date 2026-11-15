import {describe,it,expect} from 'vitest';
import {isActiveFreeTrial,isGuestCapacityError} from './activeTrial';
import {effectiveEventGuestLimit} from './guestEntitlement';
const trial={plan_name:'Starter',status:'active',is_read_only:false,expires_at:'2026-11-08T22:30:00Z'};
const now=Date.parse('2026-11-05T00:00:00Z');
describe('active trial upgrade eligibility',()=>{
 it('offers early upgrade for known active trial aliases only',()=>{for(const plan_name of ['Starter','Starter Plan','Free'])expect(isActiveFreeTrial({...trial,plan_name},false,now)).toBe(true);expect(isActiveFreeTrial(null,false,now)).toBe(false);});
 it('hides upgrade marketing for paid, expired, read-only and owner accounts',()=>{for(const plan_name of ['Essential','Premium','Unlimited Plan'])expect(isActiveFreeTrial({...trial,plan_name},false,now)).toBe(false);expect(isActiveFreeTrial({...trial,status:'expired'},false,now)).toBe(false);expect(isActiveFreeTrial({...trial,is_read_only:true},false,now)).toBe(false);expect(isActiveFreeTrial(trial,true,now)).toBe(false);expect(isActiveFreeTrial(trial,false,Date.parse(trial.expires_at))).toBe(false);});
 it('enforces trial capacity despite missing or stale event entitlement',()=>{expect(effectiveEventGuestLimit({isTrial:true,isPlatformOwner:false})).toBe(20);expect(effectiveEventGuestLimit({isTrial:true,eventGuestLimit:150,entitledGuestLimit:150,isPlatformOwner:false})).toBe(20);expect(effectiveEventGuestLimit({isTrial:true,eventGuestLimit:10,entitledGuestLimit:20,isPlatformOwner:false})).toBe(10);expect(effectiveEventGuestLimit({isTrial:false,eventGuestLimit:150,entitledGuestLimit:150,isPlatformOwner:false})).toBe(150);expect(effectiveEventGuestLimit({isTrial:true,eventGuestLimit:20,isPlatformOwner:true})).toBeNull();});
 it('recognises capacity errors without reclassifying other failures',()=>{expect(isGuestCapacityError({message:'The event guest limit has been reached'})).toBe(true);expect(isGuestCapacityError({message:'duplicate guest'})).toBe(false);expect(isGuestCapacityError({message:'WW_GUEST_PLAN_INACTIVE'})).toBe(false);});
});

import {getWeddingPlanUpgrades,PLAN_REGISTRY} from './planRegistry';
it('uses the configured 150, 250 and 450 guest plans and never offers a downgrade',()=>{
 expect(['essential','premium','unlimited'].map(key=>PLAN_REGISTRY[key as keyof typeof PLAN_REGISTRY].limits.guests)).toEqual([150,250,450]);
 expect(getWeddingPlanUpgrades('Starter').map(p=>p.key)).toEqual(['essential','premium','unlimited']);
 expect(getWeddingPlanUpgrades('Essential').map(p=>p.key)).toEqual(['premium','unlimited']);
 expect(getWeddingPlanUpgrades('Premium').map(p=>p.key)).toEqual(['unlimited']);
 expect(getWeddingPlanUpgrades('Unlimited')).toEqual([]);
});
