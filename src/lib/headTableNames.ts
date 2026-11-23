import { supabase } from '@/integrations/supabase/client';
import { getEventCelebrationType, getHeadTableDisplayName } from './headTable';
export async function headTableNameForEvent(eventId:string,name:string):Promise<string>{
 const {data,error}=await supabase.from('events').select('setup_details').eq('id',eventId).single();if(error)throw error;
 return getHeadTableDisplayName({name,table_purpose:'head'},getEventCelebrationType(data));
}
/** Normalize only generic defaults; custom names and standard tables are untouched. */
export async function normalizeEventHeadTableNames(eventId:string):Promise<boolean>{
 const {data:auth,error:authError}=await supabase.auth.getUser();if(authError)throw authError;if(!auth.user)return false;
 const {data:event,error:eventError}=await supabase.from('events').select('id,user_id,setup_details').eq('id',eventId).eq('user_id',auth.user.id).maybeSingle();if(eventError)throw eventError;if(!event)return false;
 const {data:tables,error}=await supabase.from('tables').select('id,name,table_purpose').eq('event_id',eventId).eq('user_id',event.user_id).eq('table_purpose','head');if(error)throw error;
 let changed=false;for(const table of tables||[]){const name=getHeadTableDisplayName(table,getEventCelebrationType(event));if(name===table.name)continue;const result=await supabase.from('tables').update({name}).eq('id',table.id).eq('event_id',eventId).eq('user_id',event.user_id).eq('name',table.name).select('id');if(result.error)throw result.error;changed=changed||!!result.data?.length;}
 return changed;
}
