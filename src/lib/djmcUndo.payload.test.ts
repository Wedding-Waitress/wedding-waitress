import {it,expect,vi} from 'vitest';
vi.mock('@/integrations/supabase/client',()=>({supabase:{}}));
import {sectionPayload} from './djmcUndo';
it('does not invent an optional column absent from a saved section',()=>{
 const section:any={id:'s',section_type:'cocktail',section_label:'Cocktail',order_index:1,notes:null,is_collapsed:false};
 expect(sectionPayload(section,'q')).not.toHaveProperty('section_subtitle');
 expect(sectionPayload({...section,section_subtitle:'Keep this'},'q')).toHaveProperty('section_subtitle','Keep this');
});
