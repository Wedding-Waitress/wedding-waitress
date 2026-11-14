import {createClient} from 'npm:@supabase/supabase-js@2.57.2';
import {authenticatePromotionRequest} from '../_shared/promotionRequestAuth.ts';
import {isOwnerAdminEmail} from '../_shared/owner-admin.ts';
import {verifyCleanupGrant} from '../_shared/designatedCleanupGrant.ts';
const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,apikey,x-client-info,content-type'};
const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers});
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response(null,{headers});
 if(req.method!=='POST')return reply({error:'Method not allowed'},405);
 try{
  if(Deno.env.get('SUPABASE_URL')!=='https://xytxkidpourwdbzzwcdp.supabase.co')return reply({error:'Wrong project'},403);
  const {user,db}=await authenticatePromotionRequest(req);
  if(!isOwnerAdminEmail(user.email))return reply({error:'Owner required'},403);
  const caller=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:req.headers.get('Authorization')!}}});
  const owner=await caller.rpc('is_owner_admin');
  if(owner.error||owner.data!==true)return reply({error:'Verified owner required'},403);
  const body=await req.json();
  if(Object.keys(body).some(key=>!['confirmation','admin_grant','admin_grant_signature'].includes(key))||body.confirmation!=='PURGE ONLY THE SIX APPROVED FABRICATED ACCOUNTS')return reply({error:'Exact confirmation required'},400);
  await verifyCleanupGrant(body,user.id,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const result=await db.rpc('temporary_purge_six_fabricated_accounts',{p_actor:user.id});
  if(result.error)return reply({error:`Cleanup rejected (${result.error.code}): ${result.error.message}`},409);
  return reply({success:true,result:result.data});
 }catch{return reply({error:'Current signed owner verification required; cleanup not confirmed'},403);}
});
