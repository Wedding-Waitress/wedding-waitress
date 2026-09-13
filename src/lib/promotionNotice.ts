import { promotionPreview, type PromotionPlan } from '../../supabase/functions/_shared/promotionRules';
export type PromotionNotice = { reservationId:string; state:'active'|'scheduled'; code:string; percent:number; credits:number; startsAt:string; expiresAt:string };
export function parsePromotionNotice(value:unknown):PromotionNotice|null{
 if(!value||typeof value!=='object')return null;
 const row=value as Record<string,unknown>;
 if(row.success!==true||!['active','scheduled'].includes(String(row.state))||typeof row.reservation_id!=='string'||!row.reservation_id
 ||typeof row.code!=='string'||typeof row.starts_at!=='string'||typeof row.expires_at!=='string'
 ||!Number.isFinite(Date.parse(row.starts_at))||!Number.isFinite(Date.parse(row.expires_at))||Date.parse(row.expires_at)<=Date.parse(row.starts_at))return null;
 try{
  const quote=promotionPreview(row.plan_key as PromotionPlan,row.percent_off as number);
  if(row.included_credits!==quote.includedCredits)return null;
  return {reservationId:row.reservation_id,state:row.state as 'active'|'scheduled',code:row.code,percent:row.percent_off as number,credits:quote.includedCredits,startsAt:row.starts_at,expiresAt:row.expires_at};
 }catch{return null;}
}
