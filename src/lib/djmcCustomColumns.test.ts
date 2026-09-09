import {it,expect} from 'vitest';
import {columnsFor,cellValue} from './djmcCustomColumns';
it('preserves original cells when converting to custom columns and adds empty cells',()=>{
 const section:any={section_type:'cocktail'};const columns=columnsFor(section);
 const row:any={row_label:'Song 1',song_title_artist:'Artist',music_url:'https://example.com',custom_values:{extra:'Notes'}};
 expect(columns.map(c=>cellValue(row,c))).toEqual(['Song 1','Artist','https://example.com']);
 expect(cellValue(row,{id:'new',label:'New'})).toBe('');
 expect(cellValue(row,{id:'extra',label:'Extra'})).toBe('Notes');
});
