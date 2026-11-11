// Short-lived maintenance tool, NOT a public endpoint. Default mode is read-only.
// Requires a genuine server-side service credential, never browser credentials.
import { createClient } from '@supabase/supabase-js';
import { pathToFileURL } from 'node:url';
export const targets = Object.freeze([
  Object.freeze({id:'9aaa11bf-c6a5-4ebb-adcb-c0e6aa09d862',event_id:'EV-HNBFFYPF',name:'The Best Wedding Ever',user_id:'72fc844c-a65b-4c3b-9625-9c47aa62759a'}),
  Object.freeze({id:'80acf882-5f0f-4514-9f23-900cfab74116',event_id:'EV-5F9KDKDU',name:"Daniel & Rochelle's Wedding",user_id:'61673e8d-ae9d-4d7d-8c36-44ef076f0355'}),
]);
export function verifyTarget(row, expected) {
  if (!targets.some(t=>t===expected)) throw new Error('Unapproved target');
  for (const field of ['id','event_id','name','user_id']) {
    if (row?.[field]!==expected[field]) throw new Error('Target identity mismatch');
  }
  if (row.event_image_path) throw new Error('Attachment requires reviewed storage cleanup');
}
export async function inspect(client) {
  const report=[];
  for (const target of targets) {
    const {data,error}=await client.from('events').select('id,event_id,name,user_id,event_image_path').eq('id',target.id).maybeSingle();
    if(error) throw new Error('Target inspection failed');
    if(!data) {report.push({id:target.id,absent:true});continue;}
    verifyTarget(data,target);
    for(const table of ['guests','event_media_items','event_purchases','rsvp_invite_purchases','welcome_video_uploads']) {
      const result=await client.from(table).select('id',{count:'exact',head:true}).eq('event_id',target.id);
      if(result.error || result.count!==0) throw new Error('Associated content requires explicit cleanup implementation: '+table);
    }
    report.push({id:target.id,absent:false,verified:true});
  }
  return report;
}
// Execution deliberately not implemented until FK/storage inventory and audit
// preservation are reviewed. This artifact never deletes or changes any data.
async function main() {
  if(process.argv.includes('--execute')) throw new Error('Execution is not enabled: review incomplete');
  const url=process.env.WW_MAINTENANCE_SUPABASE_URL;
  const key=process.env.WW_MAINTENANCE_SERVICE_KEY;
  if(url!=='https://xytxkidpourwdbzzwcdp.supabase.co' || !key) throw new Error('Configure exact project and genuine server service credential securely');
  const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  console.log(JSON.stringify(await inspect(client)));
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) main().catch(()=>{console.error('Maintenance inspection failed; no mutation performed.');process.exitCode=1;});
