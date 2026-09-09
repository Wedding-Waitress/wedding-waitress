import type {DJMCItem,DJMCSection} from '@/types/djMCQuestionnaire';
export type DJMCColumn = {id:string;label:string;source?:'row_label'|'value_text'|'song_title_artist'|'music_url'|'duration'};
export function defaultColumns(type:string):DJMCColumn[]{
 const first=type==='speeches'?'Speaker Status & Order':type==='introductions'?'Bridal Party Intro Order':['ceremony','main_event'].includes(type)?'Event':'Song Number';
 const columns:DJMCColumn[]=[{id:'row_label',source:'row_label',label:first}];
 if(['ceremony','introductions','traditional','speeches','do_not_play'].includes(type))columns.push({id:'value_text',source:'value_text',label:type==='speeches'?'Speaker Name':type==='do_not_play'?'Song Name':'Names / Details'});
 if(!['speeches','do_not_play'].includes(type))columns.push({id:'song_title_artist',source:'song_title_artist',label:'Song Title & Artist'},{id:'music_url',source:'music_url',label:'Music with Link'});
 if(type==='speeches')columns.push({id:'duration',source:'duration',label:'Time Allowed'});
 return columns;
}
export function cellValue(item:DJMCItem,column:DJMCColumn):string {return item.custom_values?.[column.id] ?? (column.source?String(item[column.source]??''):'');}
export function columnsFor(section:DJMCSection):DJMCColumn[]{return section.custom_columns ?? defaultColumns(section.section_type);}
