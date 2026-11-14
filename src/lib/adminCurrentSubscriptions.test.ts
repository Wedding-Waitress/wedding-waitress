import {describe,it,expect} from 'vitest';
import {currentCustomerSubscriptions} from './adminCurrentSubscriptions';
const now=Date.parse('2026-10-15T08:00:00Z');
const base={user_id:'owner',created_at:'2026-10-01',expires_at:'2026-10-22',subscription_status:'active'};
describe('current customer subscription counts',()=>{
 it('excludes subscriptions without a current customer',()=>expect(currentCustomerSubscriptions([{...base,user_id:'removed'}],new Set(['owner']),now)).toEqual([]));
 it('counts one latest record per customer',()=>expect(currentCustomerSubscriptions([base,{...base,created_at:'2026-10-10',subscription_status:'trialing'}],new Set(['owner']),now)).toEqual([{...base,created_at:'2026-10-10',subscription_status:'trialing'}]));
 it('treats past expiry as expired despite active status without mutating stored data',()=>{const row={...base,expires_at:'2026-09-16'};expect(currentCustomerSubscriptions([row],new Set(['owner']),now)[0].subscription_status).toBe('expired');expect(row.subscription_status).toBe('active');});
});