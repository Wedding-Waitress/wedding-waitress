import { isOwnerAdminEmail } from '../_shared/owner-admin.ts';
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
const headers={"Content-Type":"application/json"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
async function removePrefix(storage:any,bucket:string,prefix:string,depth=0):Promise<void>{
 if(depth>20)throw new Error('Storage nesting exceeds cleanup bounds');
 for(let page=0;page<100;page++){
  const {data,error}=await storage.from(bucket).list(prefix,{limit:1000,sortBy:{column:'name',order:'asc'}});
  if(error||!Array.isArray(data))throw error||new Error('Storage listing unavailable');
  if(!data.length)return;
  const files:string[]=[];
  for(const object of data){
   if(typeof object.name!=='string'||!object.name||object.name==='.'||object.name==='..'||object.name.includes('/'))throw new Error('Invalid storage child');
   const path=prefix+'/'+object.name;
   if(object.id==null)await removePrefix(storage,bucket,path,depth+1);else files.push(path);
  }
  if(files.length){const {error:removeError}=await storage.from(bucket).remove(files);if(removeError)throw removeError;}
 }
 throw new Error('Storage cleanup requires another run');
}
Deno.serve(async(req)=>{
  if(req.method!=='POST')return json({error:'Method not allowed'},405);
  const service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const processor=Deno.env.get('ACCOUNT_PURGE_PROCESSOR_SECRET');
  const serviceCaller=Boolean(service)&&req.headers.get('Authorization')===`Bearer ${service}`;
  const scheduledCaller=Boolean(processor&&processor.length>=32)&&req.headers.get('x-account-purge-secret')===processor;
  if(!serviceCaller&&!scheduledCaller) return json({error:"Service role required"},401);
  const admin=createClient(Deno.env.get("SUPABASE_URL")!,service,{auth:{persistSession:false}});
  let requestedAccount:string|undefined;let dryRun=false;
  try{
   const body=await req.json();
   if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(key=>!['account_owner_id','source','dry_run'].includes(key)))return json({error:'Invalid cleanup request'},400);
   if(body.account_owner_id!==undefined){if(!serviceCaller||typeof body.account_owner_id!=='string'||!(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i).test(body.account_owner_id))return json({error:'Invalid selected account'},400);requestedAccount=body.account_owner_id;}
   if(body.dry_run!==undefined&&typeof body.dry_run!=='boolean')return json({error:'Invalid dry-run selection'},400);
   dryRun=body.dry_run===true;
  }catch{return json({error:'A valid cleanup request is required'},400);}
  const {data:due,error}=await admin.rpc("get_due_account_purges",{p_limit:50});
  if(error){const reference=crypto.randomUUID();console.error("[purge-closed-accounts:read]",reference,error);return json({error:`Account cleanup could not start. Reference ${reference}.`},500);}
  const selected=(due??[]).filter((candidate:{account_owner_id:string})=>!requestedAccount||candidate.account_owner_id===requestedAccount);
  if(requestedAccount&&selected.length!==1)return json({error:"The selected account is not eligible for cleanup."},409);
  if(dryRun)return json({dry_run:true,eligible:selected.length,processed:0,failed:0});
  let processed=0,failed=0;
  for(const row of selected){
    try{
      const {data:identity,error:identityError}=await admin.auth.admin.getUserById(row.account_owner_id);
      if(identityError||!identity?.user)throw new Error('Cleanup identity unavailable');
      if(isOwnerAdminEmail(identity.user.email))continue;
      const {data:retained,error:holdError}=await admin.rpc('is_admin_customer_retained',{p_user_id:row.account_owner_id});
      if(holdError||typeof retained!=='boolean')throw holdError||new Error('Customer retention could not be verified');
      if(retained)continue;
      // Recheck before irreversible storage work: candidate snapshots may be stale.
      const {data:current,error:retentionError}=await admin.from('account_lifecycle').select('status,purge_after,admin_deleted_at').eq('account_owner_id',row.account_owner_id).single();
      if(retentionError||!current)throw retentionError||new Error('Retention state unavailable');
      if(current.admin_deleted_at||current.status!=='scheduled_for_deletion'||!Number.isFinite(Date.parse(current.purge_after))||Date.parse(current.purge_after)>Date.now())continue;
      for(const bucket of ["profile-images","event-media"])await removePrefix(admin.storage,bucket,row.account_owner_id);
      const {error:purgeError}=await admin.rpc("complete_account_purge",{p_user_id:row.account_owner_id,p_metadata:{storage_cleanup_attempted:true}});if(purgeError) throw purgeError;
      processed+=1;
    }catch(error){failed+=1;const reference=crypto.randomUUID();console.error("[purge-closed-accounts:item]",reference,error);}
  }
  if(failed>0)return json({error:"One or more account cleanups failed. Review the protected function logs.",processed,failed},500);
  return json({processed,failed:0});
});
