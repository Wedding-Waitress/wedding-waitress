import {accessExpiryReminderKey,buildAccessExpiryEmail,buildAccessExpirySms} from './accessExpiryReminder.ts';

// Provider acceptance and a durable local record are separate outcomes.
export async function processAccessExpiryBatch(db:any,items:any[],resendKey:string,sendSms:any,fetcher=fetch){
 const totals={processed:items.length,providerAccepted:0,failed:0,manualReview:0,recordingFailed:0};
 const hold=async(item:any,provider:string|null,id:string|null)=>{
  totals.manualReview++;
  try{const result=await db.rpc('hold_access_expiry_reminder',{_id:item.id,_provider:provider,_provider_id:id});
   if(result.error||result.data!==true)totals.recordingFailed++;
  }catch{totals.recordingFailed++;}
 };
 // At most three simultaneous provider requests, each bounded by its sender timeout.
 for(let start=0;start<items.length;start+=3)await Promise.all(items.slice(start,start+3).map(async item=>{
  let provider:string|null=null,providerId:string|null=null,accepted=false,unknown=false;
  try{
   if(item.channel==='email'){
    if(!item.email)throw Error('Account email unavailable');
    provider='resend';const message=buildAccessExpiryEmail(item.expires_at);unknown=true;
    const response=await fetcher('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${resendKey}`,
     'Content-Type':'application/json','Idempotency-Key':accessExpiryReminderKey(item.user_id,item.expires_at,'email')},
     body:JSON.stringify({from:'Wedding Waitress <support@weddingwaitress.com.au>',reply_to:'support@weddingwaitress.com.au',to:[item.email],subject:message.subject,html:message.html}),signal:AbortSignal.timeout(10000)});
    const result=await response.json().catch(()=>({}));
    if(!response.ok){unknown=false;throw Error('Email provider rejected the reminder');}
    if(typeof result.id!=='string'||!result.id)throw Error('Email acceptance identity missing');
    providerId=result.id;accepted=true;unknown=false;
   }else if(item.channel==='sms'){
    if(!item.phone_e164)throw Error('Verified account mobile unavailable');
    provider='twilio';unknown=true;const result=await sendSms(item.phone_e164,buildAccessExpirySms(item.expires_at));
    unknown=result.acceptanceUnknown===true;
    if(!result.accepted||typeof result.providerId!=='string'||!result.providerId){if(result.accepted)unknown=true;throw Error('SMS acceptance unconfirmed');}
    providerId=result.providerId;accepted=true;unknown=false;
   }else throw Error('Unsupported reminder channel');
   const result=await db.rpc('complete_access_expiry_reminder',{_id:item.id,_accepted:true,_provider:provider,_provider_id:providerId,_error:null});
   if(result.error||result.data!==true)throw Error('Acceptance record unconfirmed');
   totals.providerAccepted++;
  }catch{
   if(accepted||unknown){await hold(item,provider,providerId);return;}
   totals.failed++;
   try{const result=await db.rpc('complete_access_expiry_reminder',{_id:item.id,_accepted:false,_provider:null,_provider_id:null,_error:'Provider did not accept this reminder'});
    if(result.error||result.data!==true)totals.recordingFailed++;
   }catch{totals.recordingFailed++;}
  }
 }));
 return totals;
}
