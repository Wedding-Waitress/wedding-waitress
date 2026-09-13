import { useEffect,useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { startAuthenticatedCustomerActivity } from '@/lib/authenticatedCustomerActivity';
export type CustomerActivity={user_id:string;last_active_at:string|null;last_sign_in_at:string|null;account_updated_at?:string|null};
export function useAuthenticatedCustomerActivity(userId:string|null,enabled:boolean){
 useEffect(()=>{
  if(!userId||!enabled)return;
  return startAuthenticatedCustomerActivity(async()=>{
   const {error}=await supabase.rpc('record_authenticated_customer_activity' as never);if(error)throw error;
  },{target:window,doc:document,now:()=>performance.now()});
 },[userId,enabled]);
}
export function useAdminCustomerActivity(enabled:boolean){
 const [records,setRecords]=useState<Record<string,CustomerActivity>>({});
 const [snapshotRevision,setSnapshotRevision]=useState(0);
 const [connection,setConnection]=useState<'off'|'connecting'|'live'|'reconnecting'|'unavailable'>('off');
 useEffect(()=>{
  setRecords({}); if(!enabled){setConnection('off');return;}
  let active=true;let sequence=0;const metadataSeen=new Map<string,string|null|undefined>();setConnection('connecting');
  const merge=(row:CustomerActivity)=>{
   if(!active||!row?.user_id)return;
   metadataSeen.set(row.user_id,row.account_updated_at);
   setRecords(current=>{
    const previous=current[row.user_id];
    const lastActive=previous?.last_active_at&&(!row.last_active_at||Date.parse(previous.last_active_at)>Date.parse(row.last_active_at))?previous.last_active_at:row.last_active_at;
    const lastSignIn=previous?.last_sign_in_at&&(!row.last_sign_in_at||Date.parse(previous.last_sign_in_at)>Date.parse(row.last_sign_in_at))?previous.last_sign_in_at:row.last_sign_in_at;
    return {...current,[row.user_id]:{...row,last_active_at:lastActive,last_sign_in_at:lastSignIn}};
   });
  };
  const sync=async()=>{
   const request=++sequence;
   try{
    const {data,error}=await supabase.rpc('admin_get_customer_activity' as never);
    if(!active||request!==sequence)return;if(error)throw error;
    (data as unknown as CustomerActivity[]||[]).forEach(merge);
   }catch{if(active)setConnection('unavailable');}
  };
  // Subscribe first, then resync on each successful connection. Merge timestamps
  // monotonically so an old initial snapshot cannot replace a newer live update.
  const channel=supabase.channel('admin-customer-activity').on('postgres_changes',{
   event:'*',schema:'public',table:'customer_account_activity',
  },payload=>{if(payload.eventType!=='DELETE'){
   const row=payload.new as CustomerActivity;
   const metadataChanged=!!row.account_updated_at&&row.account_updated_at!==metadataSeen.get(row.user_id);
   merge(payload.new as CustomerActivity);
   if(active&&metadataChanged)setSnapshotRevision(value=>value+1);
  }}).subscribe(status=>{
   if(!active)return;
   if(status==='SUBSCRIBED'){setConnection('live');void sync();}
   else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'||status==='CLOSED')setConnection('reconnecting');
  });
  void sync();
  const reconnect=()=>{if(active)void sync();};
  window.addEventListener('online',reconnect);
  return ()=>{active=false;sequence++;window.removeEventListener('online',reconnect);void supabase.removeChannel(channel).catch(()=>{});};
 },[enabled]);
 return {records,connection,snapshotRevision};
}
