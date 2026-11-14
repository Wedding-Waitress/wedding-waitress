const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const statuses=new Set(['submitting','unknown','pending','requires_action','succeeded','failed','canceled']);
export async function readCustomerRefundHistory(admin:any,customerId:unknown,cursor?:unknown) {
 if(typeof customerId!=='string'||!uuid.test(customerId))throw new Error('Invalid customer identity.');
 let query=admin.from('admin_payment_refunds').select('id,account_owner_id,administrator_id,payment_id,payment_type,amount_minor,currency,livemode,status,access_choice,access_status,reason,customer_reason,stripe_refund_id,created_at,updated_at')
  .eq('account_owner_id',customerId).order('created_at',{ascending:false}).order('id',{ascending:false}).limit(51);
 if(cursor!==undefined){
  if(typeof cursor!=='string')throw new Error('Invalid refund history cursor.');
  const parts=cursor.split('|');
  if(parts.length!==2||!uuid.test(parts[1])||!Number.isFinite(Date.parse(parts[0]))||new Date(parts[0]).toISOString()!==parts[0])throw new Error('Invalid refund history cursor.');
  query=query.or(`created_at.lt.${parts[0]},and(created_at.eq.${parts[0]},id.lt.${parts[1]})`);
 }
 const {data,error}=await query;
 if(error||!Array.isArray(data)||data.length>51)throw new Error('Customer refund history could not be verified.');
 const seen=new Set<string>();
 for(const row of data){
  if(row.account_owner_id!==customerId||typeof row.id!=='string'||!uuid.test(row.id)||seen.has(row.id)
   ||!Number.isSafeInteger(Number(row.amount_minor))||Number(row.amount_minor)<=0||row.currency!=='aud'
   ||typeof row.livemode!=='boolean'||!statuses.has(row.status)||!['keep','suspend'].includes(row.access_choice)
   ||!['unchanged','waiting','suspended','incomplete'].includes(row.access_status)
   ||typeof row.reason!=='string'||typeof row.customer_reason!=='string'
   ||!Number.isFinite(Date.parse(row.created_at))||!Number.isFinite(Date.parse(row.updated_at)))throw new Error('Customer refund history is inconsistent.');
  seen.add(row.id);
 }
 const records=data.slice(0,50).map(row=>({...row,amount_minor:Number(row.amount_minor)}));
 const last=records.at(-1);
 return {success:true,customer_id:customerId,records,next_cursor:data.length>50&&last?`${new Date(last.created_at).toISOString()}|${last.id}`:null};
}
