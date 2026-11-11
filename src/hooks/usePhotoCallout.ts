import {useEffect,useRef,useState} from 'react';
import {supabase} from '@/integrations/supabase/client';
import {normalizePhotoCard,type PhotoCard,type PhotoPlan,type PhotoShare} from '@/types/photoCallout';
// New feature schema is intentionally isolated from generated legacy database types.
export const photoDb = supabase as unknown as import('@supabase/supabase-js').SupabaseClient;
export function usePhotoCallout(eventId:string|null){
 const [plan,setPlan]=useState<PhotoPlan|null>(null);const [loading,setLoading]=useState(false);const [saving,setSaving]=useState(false);const [error,setError]=useState('');const [shares,setShares]=useState<PhotoShare[]>([]);
 const generation=useRef(0);const active=useRef(eventId);active.current=eventId;const lock=useRef(false);
 async function load(){const run=++generation.current;setPlan(null);setShares([]);setError('');if(!eventId)return;setLoading(true);
  const {data,error:failure}=await photoDb.from('photo_callout_plans').select('*').eq('event_id',eventId).maybeSingle();
  if(run!==generation.current)return;
  if(failure)setError(failure.message);else setPlan(data?{...data,cards:data.cards.map(normalizePhotoCard)}:{event_id:eventId,cards:[],private_notes:{},revision:0});setLoading(false);
 }
 useEffect(()=>{void load();return()=>{++generation.current;};},[eventId]);
 async function save(cards:PhotoCard[],notes=plan?.private_notes||{}):Promise<boolean>{
  if(!plan||plan.event_id!==eventId||lock.current)return false;lock.current=true;setSaving(true);setError('');const target=eventId;
  try{const {data,error:failure}=await photoDb.rpc('save_photo_callout_plan',{p_event_id:target,p_cards:cards.map(normalizePhotoCard),p_private_notes:notes,p_revision:plan.revision});if(failure)throw failure;if(active.current===target)setPlan({...data,cards:data.cards.map(normalizePhotoCard)} as PhotoPlan);return true;}
  catch(err){if(active.current===target)setError(err instanceof Error?err.message:(err as {message?:string})?.message||'Could not save your cards. Please try again.');return false;}
  finally{lock.current=false;setSaving(false);}
 }
 async function refreshShares(){if(!eventId)return;const {data,error:failure}=await photoDb.from('photo_callout_shares').select('*').eq('event_id',eventId).order('created_at',{ascending:false});if(failure)throw failure;if(active.current===eventId)setShares(data||[]);}
 return {plan:plan?.event_id===eventId?plan:null,loading,saving,error,setError,save,load,shares,refreshShares};
}
