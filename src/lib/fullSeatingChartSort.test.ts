import {paginateGuests} from './fullSeatingChartLayout';
import {it,expect} from 'vitest';
import {sortFullSeatingGuests as sort,fullSeatingTableNumber} from './fullSeatingChartSort';
const guest=(id:string,table_id:string|null,first_name:string,table_no:any=null)=>({id,table_id,first_name,last_name:'',table_no});
it.each([false,true])('groups both legacy names and numeric metadata (legacy=%s)',legacy=>{
 const tables=[{id:'head',name:'Bridal Table',table_purpose:'head',table_no:null},...[10,2,1,6].map(n=>({id:'t'+n,name:legacy?'Table '+n:String(n),table_no:legacy?null:n}))];
 const guests=[guest('a','t6','Amaya'),guest('b','t2','Billy'),guest('z','t1','Zoe'),guest('c','t1','Ben'),guest('h','head','Tanya'),guest('d','t10','Ann')];
 expect(sort(guests,tables,'tableNo').map(g=>g.id)).toEqual(['h','c','z','b','a','d']);expect(guests.map(g=>g.id)).toEqual(['a','b','z','c','h','d']);
});
it('uses metadata over titles, isolates table identity/events and puts unassigned last',()=>{
 const tables=[{id:'h',name:'Zebra',table_purpose:'head'},{id:'c',name:'Paris'},{id:'n',name:'Meaningful custom',table_no:'2'},{id:'n2',name:'Table 2'},{id:'n1',name:'01'},{id:'foreign',name:'Table 0',event_id:'other'}];
 const guests=[guest('u',null,'A'),guest('x','foreign','A'),guest('c','c','A'),guest('h','h','Z'),guest('b','n','Z',99),guest('a','n','A'),guest('d','n2','B'),guest('e','n1','C'),guest('legacy',null,'D','10')];
 expect(sort(guests,tables,'tableNo','event').map(g=>g.id)).toEqual(['h','c','e','a','b','d','legacy','u','x']);
});
it('recognizes only exact default numbered names',()=>{expect(fullSeatingTableNumber({id:'x',name:'Paris 2'})).toBeNull();expect(fullSeatingTableNumber({id:'x',name:'table 12'})).toBe(12);});
it('preserves first/last name modes',()=>{const guests=[{...guest('z',null,'Zoe'),last_name:'Adams'},guest('a',null,'Amy'),{...guest('b',null,'Ben'),last_name:'Brown'}];expect(sort(guests,[],'firstName').map(g=>g.id)).toEqual(['a','b','z']);expect(sort(guests,[],'lastName').map(g=>g.id)).toEqual(['z','b','a']);});

it('keeps table grouping across the exact pagination consumed by single and all-page exports',()=>{
 const tables=[{id:'a',name:'Table 1'},{id:'b',name:'Table 2'}];
 const guests=Array.from({length:70},(_,i)=>guest(String(i),i%2?'a':'b','Name '+i));
 const sorted=sort(guests,tables,'tableNo'),pages=paginateGuests(sorted,'standard');
 expect(pages).toHaveLength(2);expect(pages.flatMap(p=>p.guests)).toEqual(sorted);
 expect(sorted.slice(0,35).every(g=>g.table_id==='a')).toBe(true);expect(sorted.slice(35).every(g=>g.table_id==='b')).toBe(true);
});
