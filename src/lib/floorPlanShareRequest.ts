import { supabase } from '@/integrations/supabase/client';
import { getCacheGeneration, getCacheUserId, registerCache } from '@/lib/cacheRegistry';
type ShareKind = 'ceremony' | 'reception';
// Only coalesce requests that are currently in flight. Every later entry validates
// the token again, so revoked links and changed permissions cannot use stale data.
const pending = new Map<string, Promise<{data: any; error: any}>>();
registerCache(() => pending.clear());
export function requestFloorPlanShare(token: string, kind: ShareKind) {
 const key = [getCacheGeneration(),getCacheUserId(),kind,token].join('|');
 const existing = pending.get(key); if(existing) return existing;
 const request = (async () => {
  try {
   return kind === 'reception' && token.length !== 64
    ? await supabase.rpc('get_reception_floor_plan_by_share_token', {_token:token})
    : await supabase.functions.invoke('floor-plan-share', {body:{token}});
  } catch(error) { return {data:null,error}; }
 })().finally(() => { if(pending.get(key) === request) pending.delete(key); });
 pending.set(key,request); return request;
}
