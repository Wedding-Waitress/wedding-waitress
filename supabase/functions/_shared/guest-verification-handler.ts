import { isVerificationCode } from './guest-verification-policy.ts';
import { GuestVerifyProviderError } from './twilio-guest-verification.ts';

type RpcResult = { data: any; error: unknown };
export type GuestVerificationDependencies = {
 rpc(name: string, args: Record<string, unknown>): PromiseLike<RpcResult>;
 provider: { checkService(): Promise<unknown>; start(mobile: string): Promise<{reference:string}>; check(reference:string,code:string,mobile:string):Promise<boolean> };
 healthAllowed(req: Request, eventId: string): Promise<boolean>;
 fingerprint(value: string): Promise<string>;
 randomToken(): string;
};
const uuid = (v: unknown): v is string => typeof v === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(v);
const cors = {
 'Access-Control-Allow-Origin':'*',
 'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
 'Access-Control-Allow-Methods':'POST, OPTIONS',
 'Cache-Control':'no-store',
};
const reply = (body: unknown, status=200) => Response.json(body,{status,headers:cors});

export function guestVerificationHandler(deps: GuestVerificationDependencies) {
 return async (req: Request): Promise<Response> => {
  if(req.method==='OPTIONS')return new Response(null,{headers:cors});
  if(req.method!=='POST')return reply({status:'unavailable'},405);
  try {
   if(Number(req.headers.get('content-length'))>4096)return reply({status:'unavailable'},400);
   const reader=req.body?.getReader(); if(!reader)return reply({status:'unavailable'},400);
   const chunks:Uint8Array[]=[]; let size=0;
   while(true){const item=await reader.read();if(item.done)break;size+=item.value.length;if(size>4096){await reader.cancel();return reply({status:'unavailable'},400);}chunks.push(item.value);}
   const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
   const body=JSON.parse(new TextDecoder().decode(bytes));
   if(!body || typeof body!=='object' || Array.isArray(body))return reply({status:'unavailable'},400);
   const rpc=async(name:string,args:Record<string,unknown>)=>{const result=await deps.rpc(name,args);if(result.error)throw new Error('Database unavailable');return result.data;};
   if(body.action==='health'){
    if(!uuid(body.event_id)||!await deps.healthAllowed(req,body.event_id))return reply({status:'unavailable'},403);
    await deps.provider.checkService();return reply({status:'ready',code_length:6,channel:'sms'});
   }
   if(body.action==='request'){
    if(!uuid(body.event_id)||!uuid(body.guest_id)||!uuid(body.request_id)||typeof body.full_name!=='string'||body.full_name.length>220)return reply({status:'unavailable'},400);
    // The destination is never accepted from a client, even if supplied as an extra key.
    const ip=req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||req.headers.get('cf-connecting-ip')||'unknown';
    const ipHash=await deps.fingerprint('qr-ip:'+ip);
    await deps.provider.checkService(); // No credit reservation if configuration fails.
    const reservation=await rpc('qr_guest_reserve',{_event_id:body.event_id,_guest_id:body.guest_id,_full_name:body.full_name,_request_id:body.request_id,_ip_hash:ipHash});
    if(!reservation||reservation.duplicate)return reply({status:'unavailable'});
    let sent:{reference:string};
    try{sent=await deps.provider.start(reservation.mobile);}
    catch(error){
     const outcome=error instanceof GuestVerifyProviderError && !error.acceptanceUnknown?'rejected':'unknown';
     await rpc('qr_guest_send_result',{_id:body.request_id,_reference:null,_outcome:outcome});
     return reply({status:'unavailable'});
    }
    const recorded=await rpc('qr_guest_send_result',{_id:body.request_id,_reference:sent.reference,_outcome:'pending'});
    if(!recorded)return reply({status:'unavailable'});
    return reply({status:'sent',challenge_id:body.request_id,expires_in:300,resend_after:60});
   }
   if(body.action==='check'){
    if(!uuid(body.challenge_id)||!isVerificationCode(body.code))return reply({status:'invalid'});
    const lease=crypto.randomUUID();
    const claim=await rpc('qr_guest_claim_check',{_id:body.challenge_id,_lease:lease});
    if(!claim)return reply({status:'invalid'});
    let approved=false;
    try{approved=await deps.provider.check(claim.reference,body.code,claim.mobile);}
    catch{
     await rpc('qr_guest_complete_check',{_id:body.challenge_id,_lease:lease,_approved:false,_token_hash:null});
     return reply({status:'invalid'});
    }
    const token=deps.randomToken();
    const session=await rpc('qr_guest_complete_check',{_id:body.challenge_id,_lease:lease,_approved:approved,_token_hash:await deps.fingerprint(token)});
    if(!session)return reply({status:'invalid'});
    return reply({status:'verified',session:token,event_id:claim.event_id,guest_id:session.guest_id,expires_at:session.expires_at});
   }
   return reply({status:'unavailable'},400);
  }catch{return reply({status:'unavailable'},503);}
 };
}
