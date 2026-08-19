import { createClient } from "npm:@supabase/supabase-js@2.57.2";
const headers={"Content-Type":"application/json"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
Deno.serve(async(req)=>{
  const service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  if(req.headers.get("Authorization")!==`Bearer ${service}`) return json({error:"Service role required"},401);
  const admin=createClient(Deno.env.get("SUPABASE_URL")!,service,{auth:{persistSession:false}});
  let requestedAccount:string|undefined;
  try{const body=await req.json();requestedAccount=typeof body?.account_owner_id==="string"?body.account_owner_id:undefined;}catch{/* Scheduled calls may have an empty body. */}
  const {data:due,error}=await admin.rpc("get_due_account_purges",{p_limit:50});
  if(error){const reference=crypto.randomUUID();console.error("[purge-closed-accounts:read]",reference,error);return json({error:`Account cleanup could not start. Reference ${reference}.`},500);}
  const selected=(due??[]).filter((candidate:{account_owner_id:string})=>!requestedAccount||candidate.account_owner_id===requestedAccount);
  if(requestedAccount&&selected.length!==1)return json({error:"The selected account is not eligible for cleanup."},409);
  let processed=0,failed=0;
  for(const row of selected){
    try{
      for(const bucket of ["profile-images","event-media"]){const {data:objects}=await admin.storage.from(bucket).list(row.account_owner_id,{limit:1000});if(objects?.length) await admin.storage.from(bucket).remove(objects.map((item)=>`${row.account_owner_id}/${item.name}`));}
      const {error:purgeError}=await admin.rpc("complete_account_purge",{p_user_id:row.account_owner_id,p_metadata:{storage_cleanup_attempted:true}});if(purgeError) throw purgeError;
      processed+=1;
    }catch(error){failed+=1;const reference=crypto.randomUUID();console.error("[purge-closed-accounts:item]",reference,error);}
  }
  if(failed>0)return json({error:"One or more account cleanups failed. Review the protected function logs.",processed,failed},500);
  return json({processed,failed:0});
});
