// Temporary candidate only. Not deployed. Requires exact deployment/run approval.
import { createClient } from 'npm:@supabase/supabase-js@2.57.2';
import { authenticatePromotionRequest } from '../_shared/promotionRequestAuth.ts';
import { isOwnerAdminEmail } from '../_shared/owner-admin.ts';
import { verifyCleanupGrant } from '../_shared/designatedCleanupGrant.ts';
const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,apikey,x-client-info,content-type'};
const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers});
Deno.serve(async req=>{
  if(req.method==='OPTIONS')return new Response(null,{headers});
  if(req.method!=='POST')return reply({error:'Method not allowed'},405);
  try {
    if(Deno.env.get('SUPABASE_URL')!=='https://xytxkidpourwdbzzwcdp.supabase.co')return reply({error:'Wrong project'},403);
    const {user,db}=await authenticatePromotionRequest(req);
    if(!isOwnerAdminEmail(user.email))return reply({error:'Owner required'},403);
    const caller=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:req.headers.get('Authorization')!}}});
    const owner=await caller.rpc('is_owner_admin');
    if(owner.error||owner.data!==true)return reply({error:'Verified owner required'},403);
    const body=await req.json();
    if(Object.keys(body).some(k=>!['confirmation','admin_grant','admin_grant_signature'].includes(k))
      ||body.confirmation!=='DELETE ONLY EV-HNBFFYPF AND EV-5F9KDKDU')return reply({error:'Exact confirmation required'},400);
    const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    await verifyCleanupGrant(body,user.id,service);
    const result=await db.rpc('temporary_cleanup_designated_test_events',{p_actor:user.id});
    if(result.error)return reply({error:`Cleanup rejected (${result.error.code}): ${result.error.message}; no success confirmed`},409);
    return reply({success:true,results:result.data});
  }catch{return reply({error:'Cleanup could not be confirmed'},403);}
});
