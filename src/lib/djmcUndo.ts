import {supabase} from '@/integrations/supabase/client';
import {DJMCSection} from '@/types/djMCQuestionnaire';

export const sectionPayload = (s: DJMCSection, questionnaireId: string) => ({
 ...(s.custom_columns !== undefined ? {custom_columns:s.custom_columns} : {}),
 id:s.id, questionnaire_id:questionnaireId, section_type:s.section_type, section_label:s.section_label,
 ...(Object.prototype.hasOwnProperty.call(s, "section_subtitle") ? { section_subtitle:s.section_subtitle ?? null } : {}),
 order_index:s.order_index, notes:s.notes, is_collapsed:s.is_collapsed,
});
export const itemPayload = (s:DJMCSection) => s.items.map(i=>({
 ...(i.custom_values !== undefined ? {custom_values:i.custom_values} : {}),
 id:i.id,section_id:s.id,row_label:i.row_label,value_text:i.value_text,song_title_artist:i.song_title_artist,
 music_url:i.music_url,duration:i.duration,order_index:i.order_index,is_default:i.is_default,
 is_bold:!!i.is_bold,is_italic:!!i.is_italic,is_underline:!!i.is_underline,is_section_header:!!i.is_section_header,
}));

// Recording references are restored through the authorized media service, never copied into a different row.
export async function saveDJMCSnapshot(questionnaireId:string, sections:DJMCSection[], shareToken?:string) {
 if (shareToken) {
  const {error,data} = await (supabase.rpc as any)('restore_dj_mc_questionnaire_snapshot', {
   p_questionnaire_id:questionnaireId,p_sections:sections,p_share_token:shareToken,
  });
  if(error || data!==true) throw error || new Error('Undo was not authorized');
  return;
 }
 const before = await supabase.from('dj_mc_sections').select('id').eq('questionnaire_id',questionnaireId);
 if(before.error) throw before.error;
 if(sections.length) {
  const saved = await supabase.from('dj_mc_sections').upsert(sections.map(s=>sectionPayload(s,questionnaireId))).select('id');
  if(saved.error || saved.data?.length!==sections.length) throw saved.error || new Error('Sections not restored');
 }
 const rows = sections.flatMap(itemPayload);
 if(rows.length) {
  const saved = await supabase.from('dj_mc_items').upsert(rows).select('id');
  if(saved.error || saved.data?.length!==rows.length) throw saved.error || new Error('Rows not restored');
 }
 // Save the replacement first. On a failure, the snapshot remains available for a safe retry.
 for(const section of sections) {
  const existing=await supabase.from('dj_mc_items').select('id').eq('section_id',section.id);
  if(existing.error) throw existing.error;
  const extras=(existing.data||[]).filter(i=>!section.items.some(saved=>saved.id===i.id)).map(i=>i.id);
  if(extras.length) {const deleted=await supabase.from('dj_mc_items').delete().in('id',extras);if(deleted.error)throw deleted.error;}
 }
 const extras=(before.data||[]).filter(s=>!sections.some(saved=>saved.id===s.id)).map(s=>s.id);
 if(extras.length) {const deleted=await supabase.from('dj_mc_sections').delete().in('id',extras);if(deleted.error)throw deleted.error;}
}

export async function readDJMCSnapshot(questionnaireId:string,shareToken?:string):Promise<DJMCSection[]> {
 if(shareToken){
  const result=await supabase.rpc('get_dj_mc_questionnaire_by_token',{share_token:shareToken});
  if(result.error||!result.data?.[0]||result.data[0].permission!=='can_edit')throw new Error('Questionnaire is unavailable');
  return result.data[0].sections as unknown as DJMCSection[];
 }
 const result=await supabase.from('dj_mc_sections').select('*, items:dj_mc_items(*)').eq('questionnaire_id',questionnaireId).order('order_index');
 if(result.error)throw result.error;
 return result.data as DJMCSection[];
}

export async function restoreDJMCSongRequests(eventId:string,requests:import('@/hooks/useGuestSongRequests').GuestSongRequestRow[]) {
 if(requests.some(row=>row.event_id!==eventId))throw new Error('Wrong event');
 if(!requests.length)return;
 const result=await supabase.from('guest_song_requests').upsert(requests).select('id');
 if(result.error||result.data?.length!==requests.length)throw result.error||new Error('Song requests not restored');
}
