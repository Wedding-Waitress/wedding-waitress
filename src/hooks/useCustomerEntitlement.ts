import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { parsePromotionNotice, type PromotionNotice } from '@/lib/promotionNotice';

export type CustomerEntitlement = {
 status:'active'|'trial_expired'|'paid_expired'|'closed'|'admin_blocked'|'access_unavailable';
 kind:'trial'|'paid'|'platform_owner'; server_now:string; expires_at:string|null;
};
const parse=(value:unknown):CustomerEntitlement|null=>{
 if(!value||typeof value!=='object')return null;
 const row=value as CustomerEntitlement;
 if(!['active','trial_expired','paid_expired','closed','admin_blocked','access_unavailable'].includes(row.status)
   ||!['trial','paid','platform_owner'].includes(row.kind)||typeof row.server_now!=='string'||!Number.isFinite(Date.parse(row.server_now)))return null;
 if(row.expires_at!==null&&(typeof row.expires_at!=='string'||!Number.isFinite(Date.parse(row.expires_at))))return null;
 if(row.status==='active'&&row.kind!=='platform_owner'&&(row.expires_at===null||Date.parse(row.expires_at)<=Date.parse(row.server_now)))return null;
 return row;
};

/** Server expiry is authoritative; monotonic elapsed time only hides stale UI.
 * Wall-clock changes cannot extend a grant. Server policies must still enforce it. */
export function useCustomerEntitlement(userId:string|null,enabled:boolean){
 const [state,setState]=useState<CustomerEntitlement|null>(null);
 const [promotion,setPromotion]=useState<PromotionNotice|null>(null);
 const [verifiedUser,setVerifiedUser]=useState<string|null>(null);
 const [checking,setChecking]=useState(enabled),[error,setError]=useState(false);
 const generation=useRef(0),timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const retry=useRef<()=>void>(()=>{});
 const refresh=useCallback(()=>retry.current(),[]);
 useEffect(()=>{
  const current=++generation.current;
  setState(null);setPromotion(null);setError(false);setVerifiedUser(null);
  if(!enabled||!userId){setChecking(false);retry.current=()=>{};return;}
  let inFlight=false,repeat=false,requestTimeout:ReturnType<typeof setTimeout>|null=null;
  const check=async()=>{
   // Resume/reconnect hides prior protected content until the server is checked.
   setChecking(true);
   if(inFlight){repeat=true;return;}
   inFlight=true;
   if(timer.current)clearTimeout(timer.current);
   const requestStarted=performance.now();
   try{
    let promotionNotice:PromotionNotice|null=null;
    const fetchEntitlement=async()=>{
     // Promotion state performs due activation on the server. Its response is
     // never access authority: the existing entitlement RPC must still approve.
     // An absent/disabled promotion backend leaves ordinary accounts unchanged.
     if(supabase.functions?.invoke){
      try{const result=await supabase.functions.invoke('get-promotion-state',{body:{}});if(!result.error)promotionNotice=parsePromotionNotice(result.data);}catch{/* entitlement remains authoritative */}
     }
     if(generation.current!==current)throw new Error('Account changed');
     return supabase.rpc('get_my_customer_entitlement' as never);
    };
    const {data,error:failure}=await Promise.race([
     fetchEntitlement(),
     new Promise<never>((_,reject)=>{requestTimeout=setTimeout(()=>reject(new Error('Entitlement verification timed out')),10000);}),
    ]);
    const decision=parse(data);
    if(failure||!decision)throw new Error('Entitlement unavailable');
    if(generation.current!==current)return;
    setState(decision);setPromotion(decision.status==='active'?promotionNotice:null);setError(false);setVerifiedUser(userId);
    if(decision.status==='active'&&decision.expires_at!==null){
     // Subtract the whole request duration conservatively, including network delay.
     const remaining=Date.parse(decision.expires_at)-Date.parse(decision.server_now)-(performance.now()-requestStarted);
     if(remaining<=0){setState({...decision,status:decision.kind==='paid'?'paid_expired':'trial_expired'});}
     else timer.current=setTimeout(()=>{
      if(generation.current!==current)return;
      if(remaining<=2147483647)setState({...decision,status:decision.kind==='paid'?'paid_expired':'trial_expired'});
      void check();
     },Math.min(remaining,2147483647));
    }
   }catch{if(generation.current===current){setState(null);setError(true);setVerifiedUser(userId);}}
   finally{
    if(requestTimeout){clearTimeout(requestTimeout);requestTimeout=null;}
    inFlight=false;
    if(generation.current===current){setChecking(false);if(repeat){repeat=false;void check();}}
   }
  };
  const visible=()=>{if(document.visibilityState!=='hidden')void check();};
  retry.current=()=>void check();void check();
  window.addEventListener('focus',visible);window.addEventListener('online',visible);
  document.addEventListener('visibilitychange',visible);
  return()=>{
   ++generation.current;retry.current=()=>{};if(timer.current)clearTimeout(timer.current);if(requestTimeout)clearTimeout(requestTimeout);
   window.removeEventListener('focus',visible);window.removeEventListener('online',visible);document.removeEventListener('visibilitychange',visible);
  };
 },[userId,enabled]);
 return {state:verifiedUser===userId?state:null,promotion:verifiedUser===userId?promotion:null,checking:checking||(enabled&&!!userId&&verifiedUser!==userId),error,refresh};
}
