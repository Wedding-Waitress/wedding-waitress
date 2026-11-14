import {useEffect,useRef,useState} from 'react';
import {supabase} from '@/integrations/supabase/client';
import {normalizePhotoCard,type PhotoCard,type PhotoPlan,type PhotoShare} from '@/types/photoCallout';
import {getCacheGeneration,registerCache,registerEventCache} from '@/lib/cacheRegistry';
// New feature schema is intentionally isolated from generated legacy database types.
export const photoDb = supabase as unknown as import('@supabase/supabase-js').SupabaseClient;
const plans = new Map<string,PhotoPlan>();
const reads = new Map<string,Promise<PhotoPlan>>();
const eventGenerations = new Map<string,number>();
registerCache(()=>{plans.clear();reads.clear();eventGenerations.clear();});
registerEventCache(eventId=>{plans.delete(eventId);reads.delete(eventId);eventGenerations.set(eventId,(eventGenerations.get(eventId)??0)+1);});

function readPlan(eventId:string){
 const existing=reads.get(eventId);if(existing)return existing;
 const request=Promise.resolve(photoDb.from('photo_callout_plans').select('*').eq('event_id',eventId).maybeSingle()).then(({data,error})=>{
  if(error)throw error;
  return data?{...data,cards:data.cards.map(normalizePhotoCard)} as PhotoPlan:{event_id:eventId,cards:[],private_notes:{},revision:0};
 }).finally(()=>{if(reads.get(eventId)===request)reads.delete(eventId);});
 reads.set(eventId,request);return request;
}
export function usePhotoCallout(eventId:string|null){
 const cached=eventId?plans.get(eventId):undefined;
 const [plan,setPlan]=useState<PhotoPlan|null>(cached??null);const [loading,setLoading]=useState(!!eventId&&!cached);const [saving,setSaving]=useState(false);const [error,setError]=useState('');const [shares,setShares]=useState<PhotoShare[]>([]);
 const generation=useRef(0);const active=useRef(eventId);active.current=eventId;const lock=useRef(false);
 async function load(){const run=++generation.current;const accountGeneration=getCacheGeneration();const eventGeneration=eventId?eventGenerations.get(eventId)??0:0;setShares([]);setError('');
  if(!eventId){setPlan(null);setLoading(false);return;}
  const known=plans.get(eventId);setPlan(known??null);setLoading(!known);
  const current=()=>run===generation.current&&active.current===eventId&&accountGeneration===getCacheGeneration()&&eventGeneration===(eventGenerations.get(eventId)??0);
  try{const next=await readPlan(eventId);if(!current())return;const latest=plans.get(eventId);const resolved=latest&&latest.revision>next.revision?latest:next;plans.set(eventId,resolved);setPlan(resolved);}
  catch(err){if(current())setError(err instanceof Error?err.message:(err as {message?:string})?.message||'Could not load your photo groups.');}
  finally{if(current())setLoading(false);}
 }
 useEffect(()=>{active.current=eventId;void load();return()=>{++generation.current;active.current=null;};},[eventId]);
 async function save(cards:PhotoCard[],notes=plan?.private_notes||{}):Promise<boolean>{
  if(!plan||plan.event_id!==eventId||lock.current)return false;lock.current=true;setSaving(true);setError('');const target=eventId;
  const accountGeneration=getCacheGeneration();
  try{const {data,error:failure}=await photoDb.rpc('save_photo_callout_plan',{p_event_id:target,p_cards:cards.map(normalizePhotoCard),p_private_notes:notes,p_revision:plan.revision});if(failure)throw failure;if(active.current===target&&accountGeneration===getCacheGeneration()){++generation.current;const next={...data,cards:data.cards.map(normalizePhotoCard)} as PhotoPlan;plans.set(target!,next);setPlan(next);}return true;}
  catch(err){if(active.current===target)setError(err instanceof Error?err.message:(err as {message?:string})?.message||'Could not save your cards. Please try again.');return false;}
  finally{lock.current=false;setSaving(false);}
 }
 async function refreshShares(){if(!eventId)return;const {data,error:failure}=await photoDb.from('photo_callout_shares').select('*').eq('event_id',eventId).order('created_at',{ascending:false});if(failure)throw failure;if(active.current===eventId)setShares(data||[]);}
 return {plan:plan?.event_id===eventId?plan:null,loading,saving,error,setError,save,load,shares,refreshShares};
}
