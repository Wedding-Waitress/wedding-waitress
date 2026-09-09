export function receptionHeaderStats(tables: {id:string;table_purpose?:string;guest_count:number}[],positions:{table_id:string}[]){
 const placed=new Set(positions.map(p=>p.table_id));
 const head=tables.filter(t=>t.table_purpose==='head');
 const guests=tables.filter(t=>t.table_purpose!=='head');
 const people=(rows:typeof tables)=>rows.reduce((n,t)=>n+(t.guest_count||0),0);
 return {headPlaced:head.filter(t=>placed.has(t.id)).length,headTotal:head.length,tablesPlaced:guests.filter(t=>placed.has(t.id)).length,tablesTotal:guests.length,guestsPlaced:people(tables.filter(t=>placed.has(t.id))),guestsTotal:people(tables)};
}
