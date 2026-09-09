import { supabase } from '@/integrations/supabase/client';
import type { ReceptionFloorPlan } from './useReceptionFloorPlan';
type Meta = { venue_name:string; room_name:string; [key:string]:string|number|undefined };
export type SavedVenueTemplate = {id:string;meta:Meta;layout:ReceptionFloorPlan};
const bucket='reception-floor-plan-backgrounds';
async function copyImage(path:string,eventId:string){
 const {data:{user}}=await supabase.auth.getUser(); if(!user)throw Error('Please sign in again.');
 const {data,error}=await supabase.storage.from(bucket).download(path); if(error||!data)throw error||Error('Could not load floor plan.');
 const next=user.id+'/'+eventId+'/'+crypto.randomUUID()+'.png';
 const result=await supabase.storage.from(bucket).upload(next,data,{contentType:data.type||'image/png'});if(result.error)throw result.error;return next;
}
export async function saveVenueTemplate({plan,meta}:{plan:ReceptionFloorPlan;meta:Meta;backgroundUrl?:string|null}){
 try {
  if(!plan.background.path)throw Error('Upload a venue floor plan before saving.');
  const path=await copyImage(plan.background.path,plan.event_id);
  const layout={room_width_m:plan.room_width_m,room_length_m:plan.room_length_m,grid_size_cm:plan.grid_size_cm,room_shape:plan.room_shape,room_polygon:plan.room_polygon,background:{...plan.background,path,visible:true,locked:true},table_positions:[],fixtures:[],manual_placement:true};
  const {error}=await (supabase as any).from('saved_venue_templates').insert({meta,layout});
  if(error){await supabase.storage.from(bucket).remove([path]);throw error;}
  return {ok:true as const};
 }catch(e){return {ok:false as const,error:e instanceof Error?e.message:String((e as any)?.message||'Could not save template.')};}
}
export async function listSavedVenueTemplates(){
 const {data,error}=await (supabase as any).from('saved_venue_templates').select('*').order('created_at',{ascending:false});if(error)throw error;return data as SavedVenueTemplate[];
}
export async function useSavedVenueTemplate(template:SavedVenueTemplate,plan:ReceptionFloorPlan){
 const path=await copyImage(template.layout.background.path!,plan.event_id);
 return {...plan,...template.layout,background:{...template.layout.background,path,visible:true,locked:true},manual_placement:true,table_positions:[],fixtures:[]};
}
