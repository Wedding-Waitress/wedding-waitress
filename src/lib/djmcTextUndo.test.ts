import {it,expect} from 'vitest';
import {textUndoUpdates} from './djmcTextUndo';
const rows:any=[{id:'section',questionnaire_id:'q',section_label:'Music',items:[{id:'guest',section_id:'section',value_text:'ABCDE',pronunciation_audio_path:'same.webm'}]}];
it('returns just text changes without touching recordings or structural fields',()=>{const desired=structuredClone(rows);desired[0].items[0].value_text='ABCD';expect(textUndoUpdates(rows,desired)).toEqual({sections:[],items:[{id:'guest',changes:{value_text:'ABCD'}}]});});
it.each(['id','section_id','pronunciation_audio_path','order_index','is_bold'])('keeps %s changes on the structured recovery path',key=>{const desired=structuredClone(rows);desired[0].items[0][key]='changed';expect(textUndoUpdates(rows,desired)).toBeNull();});
it('keeps deleted sections and rows on the structured recovery path',()=>{expect(textUndoUpdates(rows,[])).toBeNull();expect(textUndoUpdates(rows,[{...rows[0],items:[]}])).toBeNull();});
