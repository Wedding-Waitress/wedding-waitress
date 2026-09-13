import { useEffect,useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useAdminPreviewMedia(customerId:string|undefined,eventId:string,kind:'event_image'|'live_view_invitation'|'live_view_welcome'|'live_view_reception'|'live_view_menu'|'live_view_hero'|'reception_background'|'questionnaire_audio'|'invitation_background'|'signage_background'|'place_card_background'|'qr_logo'|'profile_image'|'booth_strip_logo'|'booth_strip_template'|'gallery_cover'|'gallery_logo'|'gallery_background'|'event_media',recordId:string|undefined,enabled:boolean,sourceIdentity?:string){
 const [url,setUrl]=useState<string|null>(null),[error,setError]=useState(false),[loading,setLoading]=useState(false);
 // Bind a URL to the full request identity, never another customer's prior asset.
 const identity=JSON.stringify([customerId,eventId,kind,recordId,enabled,sourceIdentity]);
 const [verifiedIdentity,setVerifiedIdentity]=useState('');
 const [expiresAt,setExpiresAt]=useState(0);
 useEffect(()=>{
  let active=true,generation=0;let timer:ReturnType<typeof setTimeout>|undefined;
  let timeout:ReturnType<typeof setTimeout>|undefined;
  setUrl(null);setError(false);setVerifiedIdentity('');
  if(!enabled||!customerId){setLoading(false);return;}
  const check=async()=>{
   const request=++generation;
   if(timer)clearTimeout(timer);if(timeout)clearTimeout(timeout);
   setUrl(null);setExpiresAt(0);setVerifiedIdentity('');
   setLoading(true);
   timeout=setTimeout(()=>{if(active&&request===generation){generation++;setUrl(null);setError(true);setVerifiedIdentity(identity);setLoading(false);}},10000);
   try {
    const {data,error:failure}=await supabase.functions.invoke('admin-customer-preview-media',{body:{customer_id:customerId,event_id:eventId,kind,record_id:recordId,admin_grant:sessionStorage.getItem('ww_admin_grant'),admin_grant_signature:sessionStorage.getItem('ww_admin_grant_sig')}});
    const parsed=data&&typeof data.url==='string'?new URL(data.url):null;
    const configured=new URL(import.meta.env.VITE_SUPABASE_URL);
    const remaining=data&&typeof data.expires_at==='string'?Date.parse(data.expires_at)-Date.now():NaN;
    if(failure||data?.read_only!==true||!parsed||parsed.origin!==configured.origin||!parsed.pathname.startsWith('/storage/v1/object/sign/')||!Number.isFinite(remaining)||remaining<=0)throw new Error('Unverified media');
    if(!active||request!==generation)return;
    setExpiresAt(Date.parse(data.expires_at));
    setUrl(data.url);setError(false);setVerifiedIdentity(identity);
    timer=setTimeout(()=>{if(active){setUrl(null);void check();}},Math.min(remaining,540000));
   }catch{if(active&&request===generation){setUrl(null);setError(true);setVerifiedIdentity(identity);}}
   finally{if(active&&request===generation){if(timeout)clearTimeout(timeout);setLoading(false);}}
  };
  const resume=()=>{if(document.visibilityState!=='hidden')void check();};
  window.addEventListener('focus',resume);document.addEventListener('visibilitychange',resume);
  void check();
  return()=>{active=false;generation++;if(timer)clearTimeout(timer);if(timeout)clearTimeout(timeout);window.removeEventListener('focus',resume);document.removeEventListener('visibilitychange',resume);};
 },[identity,customerId,eventId,kind,recordId,enabled]);
 return {url:verifiedIdentity===identity&&expiresAt>Date.now()?url:null,error:verifiedIdentity===identity&&error,loading};
}
