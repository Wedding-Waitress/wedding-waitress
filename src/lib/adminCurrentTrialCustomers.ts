import {currentCustomerSubscriptions} from './adminCurrentSubscriptions';
type TrialSubscription={user_id:string;created_at:string;started_at:string;expires_at:string;subscription_status:string;plan_name:string;is_read_only?:boolean};
/** Reporting only: use the latest authoritative subscription, never signup age or a customer plan label. */
export function currentTrialCustomerIds<T extends TrialSubscription>(subscriptions:T[],customerIds:Set<string>,now=Date.now()):Set<string>{
 return new Set(currentCustomerSubscriptions(subscriptions,customerIds,now).filter(row=>{
  const start=Date.parse(row.started_at),end=Date.parse(row.expires_at);
  return (/starter|trial/i.test(row.plan_name)||row.subscription_status==='trialing')
   && ['active','trialing'].includes(row.subscription_status)&&row.is_read_only!==true
   && Number.isFinite(start)&&start<=now&&Number.isFinite(end)&&end>now;
 }).map(row=>row.user_id));
}
