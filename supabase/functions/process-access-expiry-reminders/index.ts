import {createClient} from 'npm:@supabase/supabase-js@2.58.0';
import {processAccessExpiryBatch} from '../_shared/accessExpiryReminderProcessor.ts';
import {sendPlatformSms} from '../_shared/platformSms.ts';
const json=(body:unknown,status=200)=>Response.json(body,{status});
Deno.serve(async(req)=>{
 if(req.method!=='POST')return json({error:'Method not allowed'},405);
 const url=Deno.env.get('SUPABASE_URL'),service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),secret=Deno.env.get('ACCESS_EXPIRY_PROCESSOR_SECRET'),resend=Deno.env.get('RESEND_API_KEY');
 if(!url||!service||!secret||!resend)return json({error:'Server configuration error'},500);
 if(req.headers.get('x-access-expiry-processor-secret')!==secret)return json({error:'Not authorised'},401);
 try{
  const db=createClient(url,service,{auth:{persistSession:false}});
  const stale=await db.rpc('hold_stale_access_expiry_reminders');
  if(stale.error)return json({error:'Could not reconcile expired reminder locks'},503);
  const schedule=await db.rpc('schedule_access_expiry_reminders');
  if(schedule.error)return json({error:'Could not schedule expiry reminders'},503);
  const claim=await db.rpc('claim_access_expiry_reminders',{_limit:6});
  if(claim.error||!Array.isArray(claim.data))return json({error:'Could not claim expiry reminders'},503);
  const result=await processAccessExpiryBatch(db,claim.data,resend,sendPlatformSms);
  return json({...result,manualReviewHeld:Number(stale.data)||0},Number(stale.data)>0||result.manualReview||result.recordingFailed||result.failed?503:200);
 }catch{return json({error:'Reminder processing could not be confirmed'},503);}
});
