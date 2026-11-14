type Row = {user_id:string; created_at:string; expires_at:string; subscription_status:string};
export function currentCustomerSubscriptions<T extends Row>(rows:T[], customerIds:Set<string>, now=Date.now()):T[] {
  const latest=new Map<string,T>();
  for(const row of rows) if(customerIds.has(row.user_id)) {
    const old=latest.get(row.user_id);
    if(!old || Date.parse(row.created_at)>Date.parse(old.created_at)) latest.set(row.user_id,row);
  }
  return [...latest.values()].map(row=>({...row, subscription_status: ['active','trialing'].includes(row.subscription_status) && Number.isFinite(Date.parse(row.expires_at)) && Date.parse(row.expires_at)<=now ? 'expired' : row.subscription_status}));
}
