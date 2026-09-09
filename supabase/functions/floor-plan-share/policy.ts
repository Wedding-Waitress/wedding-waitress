
const types = new Set(['bridal_table','stage','dance_floor','bar','door','toilets','kitchen','dj_band','cake_table','gift_table','photo_booth','column','wishing_well','window','wall','text','block']);
const number=(v:unknown,min=-1000,max=1000)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)throw Error('Invalid layout geometry');return v;};
const text=(v:unknown,max:number)=>{if(typeof v!=='string'||v.length>max)throw Error('Invalid text');return v;};
const geometry=(v:any)=>({x:number(v.x),y:number(v.y),rotation:number(v.rotation,-36000,36000),locked:!!v.locked});
export function requireEditor(link:any,action:string){
 if(action==='trial'&&link.kind==='ceremony'&&link.permission==='view_only')return;
 if(action!=='get'&&(link.kind!=='reception'||link.permission!=='can_edit'))throw Error('This link only allows viewing.');
}
export function sanitizeDraft(input:any,plan:any,tables:any[]){
 if(!input||!Array.isArray(input.table_positions)||input.table_positions.length>tables.length||!Array.isArray(input.fixtures)||input.fixtures.length>500)throw Error('Invalid layout');
 const seen=new Set();
 const table_positions=input.table_positions.map((p:any)=>{
  const t=tables.find(t=>t.id===p.table_id);
  if(!t||seen.has(t.id))throw Error('Only the couple’s existing tables can be placed');seen.add(t.id);
  const original=(plan.table_positions??[]).find((p:any)=>p.table_id===t.id);
  return {table_id:t.id,...geometry(p),...(p.width_m!=null?{width_m:number(p.width_m,.05,100)}:{}),...(p.height_m!=null?{height_m:number(p.height_m,.05,100)}:{}),
   note:original?.note??'',table_name:t.name,table_no:t.table_no,table_type:t.table_type,capacity:t.limit_seats,table_purpose:t.table_purpose,head_seating_order:t.head_seating_order,
   occupied_count:t.guest_count,occupied_seat_numbers:t.occupied_seat_numbers};
 });
 const ids=new Set();
 const fixtures=input.fixtures.map((f:any)=>{
  const id=text(f.id,100);if(!id||ids.has(id)||!types.has(f.type))throw Error('Invalid fixture');ids.add(id);
  const original=(plan.fixtures??[]).find((p:any)=>p.id===id&&p.type===f.type);
  if(f.type==='bridal_table'&&!original)throw Error('Use the couple’s existing head table');
  return {...(original?.linked_table_id?Object.fromEntries(Object.entries(original).filter(([k])=>k.startsWith('linked_table_'))):{}),
   id,type:f.type,...geometry(f),width_m:number(f.width_m,.05,100),height_m:number(f.height_m,.05,100),...(f.label!=null?{label:text(f.label,200)}:{})};
 });
 const b=input.background;if(!b)throw Error('Missing background');
 return {table_positions,fixtures,vendor_notes:text(input.vendor_notes??'',4000),manual_placement:!!input.manual_placement,
 background:{path:plan.background_image_url??null,...geometry(b),width:b.width==null?null:number(b.width,.05,100),height:b.height==null?null:number(b.height,.05,100),
 opacity:number(b.opacity,.1,1),visible:!!b.visible&&!!b.path}};
}
