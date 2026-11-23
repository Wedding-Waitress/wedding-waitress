type ChartGuest = {id:string;first_name:string;last_name?:string|null;table_id?:string|null;table_no?:number|string|null};
type ChartTable = {id:string;name?:string|null;table_no?:number|string|null;table_purpose?:string;event_id?:string};
const compare=(a:string,b:string)=>a.localeCompare(b,undefined,{numeric:true,sensitivity:'base'});
const number=(value:unknown):number|null=>typeof value==='number'&&Number.isFinite(value)?value:typeof value==='string'&&/^\d+$/.test(value.trim())?Number(value):null;
/** Metadata is authoritative; legacy tables may encode numbers only as exact default names. */
export function fullSeatingTableNumber(table:ChartTable):number|null{
 const stored=number(table.table_no);if(stored!==null)return stored;
 const match=/^(?:Table\s+)?(\d+)$/i.exec(table.name?.trim()||'');return match?Number(match[1]):null;
}
export function sortFullSeatingGuests<T extends ChartGuest>(guests:T[],tables:ChartTable[],sortBy:string,eventId?:string):T[]{
 const scoped=tables.filter(t=>!eventId||!t.event_id||t.event_id===eventId),byId=new Map(scoped.map(t=>[t.id,t]));
 const names=(a:T,b:T)=>compare(a.first_name||'',b.first_name||'')||compare(a.last_name||'',b.last_name||'')||a.id.localeCompare(b.id);
 const key=(guest:T)=>{
  const table=guest.table_id?byId.get(guest.table_id):undefined;
  if(table){const n=fullSeatingTableNumber(table);return{rank:table.table_purpose==='head'?0:n===null?1:2,n:n??0,label:n===null?(table.name||''):'',id:table.id};}
  const n=!guest.table_id?number(guest.table_no):null;
  return {rank:n===null?3:2,n:n??0,label:guest.table_id||'',id:guest.table_id||'legacy:'+n};
 };
 return [...guests].sort((a,b)=>{
  if(sortBy==='firstName')return (`${a.first_name} ${a.last_name||''}`.trim()).localeCompare(`${b.first_name} ${b.last_name||''}`.trim());
  if(sortBy==='lastName'){const x=(a.last_name||'').trim(),y=(b.last_name||'').trim();if(!x&&y)return 1;if(x&&!y)return -1;return compare(x,y)||compare((a.first_name||'').trim(),(b.first_name||'').trim());}
  const x=key(a),y=key(b);return x.rank-y.rank||x.n-y.n||compare(x.label,y.label)||x.id.localeCompare(y.id)||names(a,b);
 });
}
