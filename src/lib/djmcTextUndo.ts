import type {DJMCSection,DJMCItem} from '@/types/djMCQuestionnaire';
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
/** Fast-path only unchanged structure/recording identity; destructive recovery keeps the full snapshot path. */
export function textUndoUpdates(current:DJMCSection[],desired:DJMCSection[]){
 if(current.length!==desired.length)return null;
 const sections:Array<{id:string;changes:Partial<DJMCSection>}>=[],items:Array<{id:string;changes:Partial<DJMCItem>}>=[];
 for(let n=0;n<current.length;n++){
  const a=current[n],b=desired[n];if(a.id!==b.id||a.items.length!==b.items.length)return null;
  const sectionChanges:Partial<DJMCSection>={};
  for(const key of new Set([...Object.keys(a),...Object.keys(b)])){
   if(['items','updated_at'].includes(key)||same(a[key],b[key]))continue;
   if(!['section_label','section_subtitle','notes'].includes(key))return null;
   sectionChanges[key]=b[key];
  }
  if(Object.keys(sectionChanges).length)sections.push({id:a.id,changes:sectionChanges});
  for(let i=0;i<a.items.length;i++){
   const x=a.items[i],y=b.items[i];if(x.id!==y.id)return null;
   const changes:Partial<DJMCItem>={};
   for(const key of new Set([...Object.keys(x),...Object.keys(y)])){
    if(key==='updated_at'||same(x[key],y[key]))continue;
    if(!['row_label','value_text','song_title_artist','music_url','duration','custom_values'].includes(key))return null;
    changes[key]=y[key];
   }
   if(Object.keys(changes).length)items.push({id:x.id,changes});
  }
 }
 return {sections,items};
}
