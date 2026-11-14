import {describe,it,expect,vi} from 'vitest';
import {loadFloorPlanAndEvent,loadReceptionShareContent} from '../../supabase/functions/floor-plan-share/load';
import {requireEditor} from '../../supabase/functions/floor-plan-share/policy';
function fakeDatabase() {
 const calls:Array<{table:string;filters:any[]}> = []; let active=0, maximum=0;
 const values:any={reception_floor_plans:{id:'plan',event_id:'event',user_id:'owner'},ceremony_floor_plans:{id:'plan',event_id:'event',user_id:'owner'},events:{name:'Wedding'},tables:[{id:'table1',name:'Table 1',limit_seats:8},{id:'table2',name:'Table 2',limit_seats:6}],guests:[{table_id:'table1',seat_no:3},{table_id:'table1',seat_no:null},{table_id:'table2',seat_no:2}],reception_collaborator_drafts:{payload:{vendor_notes:'Venue notes'},revision:4,status:'draft'}};
 const read=async(table:string)=>{active++;maximum=Math.max(maximum,active);await new Promise(resolve=>setTimeout(resolve,20));active--;return {data:values[table],error:null};};
 const db={from:(table:string)=>{
  const call={table,filters:[] as any[]};calls.push(call);
  const chain:any={select:()=>chain,eq:(key:string,value:any)=>{call.filters.push([key,value]);return chain;},single:()=>read(table),maybeSingle:()=>read(table),then:(resolve:any,reject:any)=>read(table).then(resolve,reject)};return chain;
 },storage:{from:(bucket:string)=>({createSignedUrl:vi.fn(async(path:string,ttl:number)=>{calls.push({table:'signed-image',filters:[bucket,path,ttl]});active++;maximum=Math.max(maximum,active);await new Promise(resolve=>setTimeout(resolve,20));active--;return {data:{signedUrl:'/original-quality-signed.png'},error:null};})})}};
 return {db,calls,maximum:()=>maximum};
}
it.each(['ceremony','reception'])('loads %s plan and event concurrently with owner filters intact',async kind=>{
 const mock=fakeDatabase();const result=await loadFloorPlanAndEvent(mock.db,{kind,event_id:'event',user_id:'owner'});
 expect(mock.maximum()).toBe(2);expect(result.plan.data.id).toBe('plan');
 expect(mock.calls[0].filters).toEqual([['event_id','event'],['user_id','owner']]);
});
it('loads Reception tables, guests, original background and editor draft in parallel without altering recipient data',async()=>{
 const mock=fakeDatabase();const content=await loadReceptionShareContent(mock.db,{event_id:'event',id:'link',permission:'can_edit'},{background_image_url:'original.png'},true);
 expect(mock.maximum()).toBe(4);expect(content.backgroundUrl).toBe('/original-quality-signed.png');
 expect(content.tables[0]).toMatchObject({id:'table1',guest_count:2,occupied_seat_numbers:[3]});
 expect(content.tables[1]).toMatchObject({id:'table2',guest_count:1,occupied_seat_numbers:[2]});
 expect(content.draft).toMatchObject({revision:4,payload:{vendor_notes:'Venue notes'}});
 expect(mock.calls.find(call=>call.table==='signed-image')?.filters).toEqual(['reception-floor-plan-backgrounds','original.png',3600]);
 expect(mock.calls.find(call=>call.table==='reception_collaborator_drafts')?.filters).toEqual([['link_id','link']]);
});
it('does not read editor drafts for a view-only recipient or image assets for a save',async()=>{
 const mock=fakeDatabase();await loadReceptionShareContent(mock.db,{event_id:'event',id:'link',permission:'view_only'},{background_image_url:'original.png'},true);
 expect(mock.calls.some(call=>call.table==='reception_collaborator_drafts')).toBe(false);
 const save=fakeDatabase();await loadReceptionShareContent(save.db,{event_id:'event',id:'link',permission:'can_edit'},{background_image_url:'original.png'},false);
 expect(save.calls.some(call=>call.table==='signed-image'||call.table==='reception_collaborator_drafts')).toBe(false);
 expect(()=>requireEditor({kind:'reception',permission:'view_only'},'save')).toThrow();
 expect(()=>requireEditor({kind:'ceremony',permission:'view_only'},'submit')).toThrow();
});

if(process.env.FLOOR_SHARE_PERF === '1') it.each([['ceremony','view_only'],['reception','view_only'],['reception','can_edit']])('controlled content-read benchmark %s %s', async(kind,permission)=>{
 const fs=await import('node:fs');const link={kind,permission,event_id:'event',user_id:'owner',id:'link'};
 for(const label of ['before','after']) {
  const mock=fakeDatabase();const start=performance.now();
  if(label==='before') {
   await mock.db.from(kind==='ceremony'?'ceremony_floor_plans':'reception_floor_plans').select('*').eq('event_id','event').eq('user_id','owner').single();
   await mock.db.from('events').select('*').eq('id','event').single();
   if(kind==='reception') {
    await mock.db.from('tables').select('*').eq('event_id','event');
    await mock.db.from('guests').select('*').eq('event_id','event');
    await mock.db.storage.from('reception-floor-plan-backgrounds').createSignedUrl('original.png',3600);
    if(permission==='can_edit')await mock.db.from('reception_collaborator_drafts').select('*').eq('link_id','link').maybeSingle();
   }
  } else {
   await loadFloorPlanAndEvent(mock.db,link);
   if(kind==='reception')await loadReceptionShareContent(mock.db,link,{background_image_url:'original.png'},true);
  }
  fs.appendFileSync('artifacts/floor-plan-share-timings.jsonl',JSON.stringify({kind,permission,label,controlledContentReadMs:performance.now()-start})+'\n');
 }
});
