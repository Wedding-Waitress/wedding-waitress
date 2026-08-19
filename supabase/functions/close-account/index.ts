import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...corsHeaders,"Content-Type":"application/json"}});

Deno.serve(async(req)=>{
  if(req.method==="OPTIONS") return new Response(null,{headers:corsHeaders});
  if(req.method!=="POST") return json({error:"Method not allowed"},405);
  try{
    const authHeader=req.headers.get("Authorization"); if(!authHeader?.startsWith("Bearer ")) return json({error:"Unauthenticated"},401);
    const url=Deno.env.get("SUPABASE_URL")!,anon=Deno.env.get("SUPABASE_ANON_KEY")!,service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient=createClient(url,anon,{global:{headers:{Authorization:authHeader}}});
    const admin=createClient(url,service,{auth:{persistSession:false}});
    const token=authHeader.slice(7); const {data:{user},error:userError}=await userClient.auth.getUser(token);
    if(userError||!user?.email) return json({error:"Unauthenticated"},401);
    const payload=JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));
    if(!payload.auth_time||Date.now()/1000-Number(payload.auth_time)>600) return json({error:"Recent authentication is required"},401);
    const {confirmation}=await req.json(); if(confirmation!=="DELETE"&&String(confirmation).toLowerCase()!==user.email.toLowerCase()) return json({error:"Confirmation text does not match"},400);
    const {data:membership}=await admin.from("account_members").select("role,account_owner_id").eq("member_user_id",user.id).eq("account_owner_id",user.id).maybeSingle();
    if(membership?.role!=="master") return json({error:"Only the account owner can delete this account"},403);
    let cancelled=true,cancellationError:string|null=null;
    const stripeKey=Deno.env.get("STRIPE_SECRET_KEY");
    if(stripeKey){
      try{const stripe=new Stripe(stripeKey,{apiVersion:"2025-08-27.basil"});const customers=await stripe.customers.list({email:user.email,limit:1});if(customers.data[0]){const subscriptions=await stripe.subscriptions.list({customer:customers.data[0].id,status:"all",limit:100});for(const sub of subscriptions.data.filter(s=>["active","trialing","past_due","unpaid"].includes(s.status))) await stripe.subscriptions.cancel(sub.id);}}
      catch(error){cancelled=false;cancellationError=error instanceof Error?error.message:"Stripe cancellation failed";}
    }
    const {data,error}=await admin.rpc("schedule_account_closure",{p_user_id:user.id,p_stripe_cancelled:cancelled,p_processing_error:cancellationError,p_metadata:{source:"self_service",stripe_configured:!!stripeKey}});
    if(error) return json({error:error.message},error.code==="42501"?403:500);
    return json({success:true,lifecycle:data,stripeCancellationSucceeded:cancelled,warning:cancellationError});
  }catch(error){return json({error:error instanceof Error?error.message:"Account closure failed"},500);}
});
