import {useEffect} from 'react';
import {supabase} from '@/integrations/supabase/client';
import {recordedCustomerCountry} from '@/lib/adminCustomerContact';
// Best-effort network country, not verified residence. Existing recorded values
// are never replaced. No precise location, external provider or stored IP.
export function useCustomerCountry(userId:string|null,enabled:boolean){
 useEffect(()=>{
  if(!enabled||!userId)return;
  let active=true;const abort=new AbortController();
  void (async()=>{
   try{
    const {data,error}=await supabase.from('profiles').select('country_code').eq('id',userId).maybeSingle();
    if(error||!active||data?.country_code)return;
    const response=await fetch('/api/customer-country',{signal:abort.signal,cache:'no-store'});
    if(!response.ok||!response.headers.get('content-type')?.includes('application/json'))return;
    const result=await response.json();const country=recordedCustomerCountry(result.country_code);
    if(!active||!country||result.source!=='netlify-country')return;
    // RLS remains authoritative; null-only update avoids a concurrent overwrite.
    await supabase.from('profiles').update({country_code:country}).eq('id',userId).is('country_code',null);
   }catch{/* Unknown remains unknown; no background retry or access failure. */}
  })();
  return()=>{active=false;abort.abort();};
 },[userId,enabled]);
}
