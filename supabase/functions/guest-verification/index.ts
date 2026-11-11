import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { createGuestVerifyProvider } from '../_shared/twilio-guest-verification.ts';
import { guestVerificationHandler } from '../_shared/guest-verification-handler.ts';

const url=Deno.env.get('SUPABASE_URL')!;
const serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const admin=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
const hash=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(x=>x.toString(16).padStart(2,'0')).join('');

Deno.serve(async(req:Request)=>{
 try {
  const provider=createGuestVerifyProvider({accountSid:Deno.env.get('TWILIO_ACCOUNT_SID')||'',authToken:Deno.env.get('TWILIO_AUTH_TOKEN')||'',serviceSid:Deno.env.get('TWILIO_VERIFY_SERVICE_SID')||''});
  return await guestVerificationHandler({
   rpc:(name,args)=>admin.rpc(name,args),provider,
   fingerprint:async(value)=>hash(value.startsWith('qr-ip:')?value+':'+serviceKey:value),
   randomToken:()=>Array.from(crypto.getRandomValues(new Uint8Array(32))).map(x=>x.toString(16).padStart(2,'0')).join(''),
   healthAllowed:async(request,eventId)=>{
    const authorization=request.headers.get('Authorization')||'';
    if(!authorization.startsWith('Bearer '))return false;
    // Supabase's authenticated function-test control may use the existing service credential.
    // This path only checks provider readiness and never sends a message or returns credentials.
    if(authorization.slice(7)===serviceKey)return true;
    const {data,error}=await admin.auth.getUser(authorization.slice(7));
    if(error||!data.user)return false;
    const {data:event}=await admin.from('events').select('user_id').eq('id',eventId).maybeSingle();
    return event?.user_id===data.user.id;
   },
  })(req);
 }catch{return Response.json({status:'unavailable'},{status:503,headers:{'Access-Control-Allow-Origin':'*','Cache-Control':'no-store'}});}
});
