// Runs PostgreSQL/PLpgSQL locally against isolated fixture tables. Never reads app secrets.
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const { PGlite } = await import(process.env.PROMOTION_PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
const base = readFileSync('supabase/migrations/20260913024259_public_percentage_promotions.sql','utf8');
const migration = readFileSync('supabase/migrations/20261019060702_promotion_audiences_and_limits.sql','utf8');
let checks = 0;
const owner = '00000000-0000-4000-8000-000000000001';
const uuid = n => `00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const scalar = async (sql, params=[]) => (await db.query(sql,params)).rows[0].result;
const admin = (action,payload={},actor=owner) => scalar('select public.admin_manage_promotion($1,$2,$3::jsonb) result',[actor,action,JSON.stringify(payload)]);
const create = (code, audience='general', usage_limit=1, bound_account_id=null) => admin('create_audience_campaign',{code,campaign_name:code,percent_off:50,audience,usage_limit,bound_account_id});
const reserve = (id,code) => scalar("select public.reserve_first_purchase_promotion($1,$2,'essential') result",[id,code]);
const quote = (id,code) => scalar("select public.quote_first_purchase_promotion($1,$2,'essential') result",[id,code]);
async function check(label,fn){await fn();checks++;console.log('PASS '+label);}
try {
 await db.exec(`CREATE SCHEMA private; CREATE SCHEMA auth;
 CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
 CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,email_confirmed_at timestamptz,is_anonymous boolean DEFAULT false);
 CREATE TABLE public.profiles(id uuid PRIMARY KEY,account_id text,first_name text,last_name text);
 CREATE TABLE public.account_members(account_owner_id uuid,member_user_id uuid,role text,accepted_at timestamptz,access_disabled_at timestamptz);
 CREATE TABLE public.account_lifecycle(account_owner_id uuid,status text);
 CREATE TABLE public.paid_plan_purchases(user_id uuid);
 CREATE TABLE public.user_subscriptions(user_id uuid,plan_id text);
 CREATE TABLE public.account_lifecycle_audit(account_owner_id uuid,actor_user_id uuid,action text,metadata jsonb);
 CREATE FUNCTION private.is_platform_owner(id uuid) RETURNS boolean LANGUAGE sql AS $$SELECT id='${owner}'::uuid$$;
 CREATE FUNCTION private.account_planning_blocked(id uuid) RETURNS boolean LANGUAGE sql AS $$SELECT false$$;
 CREATE FUNCTION private.admin_deleted_planning_blocked(id uuid) RETURNS boolean LANGUAGE sql AS $$SELECT false$$;
 SET request.jwt.claim.role='service_role';`);
 await db.exec(base.slice(0,base.indexOf('CREATE FUNCTION public.admin_manage_promotion')).replace('BEGIN;',''));
 // Include the real existing evidence-checked completion recorder, not a mocked counter.
 await db.exec(base.slice(base.indexOf('CREATE FUNCTION public.record_verified_promotion_completion'),base.indexOf('CREATE FUNCTION private.guard_competing_promotion_purchase')));
 await db.exec("INSERT INTO public.promotion_campaigns(code,campaign_name,percent_off,created_by) VALUES('LEGACY','Legacy',50,'"+owner+"')");
 await db.exec(base.slice(base.indexOf('CREATE FUNCTION public.admin_manage_promotion'),base.indexOf('CREATE FUNCTION public.reserve_first_purchase_promotion')));
 await check('a new audience action fails closed against the old database API',async()=>{
  await assert.rejects(create('VERSIONMISMATCH','general',1));
  assert.equal(await scalar("select count(*)::integer result from public.promotion_campaigns where code='VERSIONMISMATCH'"),0);
 });
 await db.exec(migration);
 await db.exec(readFileSync('supabase/migrations/20261030053000_campaign_deletion.sql','utf8'));
 await db.exec(readFileSync('supabase/migrations/20261030065136_promotion_expired_reservation_release.sql','utf8'));
 await db.exec(readFileSync('supabase/migrations/20261030095445_promotion_campaign_expiry.sql','utf8'));
 for(let n=1;n<=110;n++){
  await db.query('INSERT INTO auth.users VALUES($1,$2,now(),false)',[uuid(n),`person${n}@example.test`]);
  await db.query('INSERT INTO public.profiles VALUES($1,$2,$3,$4)',[uuid(n),`ACC-${n}`,'Person',String(n)]);
  await db.query("INSERT INTO public.account_members VALUES($1,$1,'master',now(),null)",[uuid(n)]);
 }
 await check('legacy campaign allocation remains uncapped and unchanged',async()=>{const row=(await admin('list'))[0];assert.equal(row.usage_limit,null);assert.equal(row.legacy_unlimited,true);});
 await check('missing audience and noninteger/out-of-range limits fail closed',async()=>{
  await assert.rejects(admin('create',{code:'BAD',campaign_name:'Bad',percent_off:50}));
  for(const limit of [-1,101,1.5,'1',null])await assert.rejects(create('BAD','general',limit));
 });
 await check('zero means no redemption in quote or reservation',async()=>{await create('ZERO','general',0);await assert.rejects(quote(uuid(2),'ZERO'));await assert.rejects(reserve(uuid(2),'ZERO'));});
 await check('customer binding rejects other accounts but allows the selected account',async()=>{
  await create('PERSONAL','customer',10,uuid(2));await assert.rejects(reserve(uuid(3),'PERSONAL'));await assert.rejects(quote(uuid(3),'PERSONAL'));
  assert.equal((await quote(uuid(2),'PERSONAL')).percent_off,50);await reserve(uuid(2),'PERSONAL');
 });
 let campaign;let first;
 await check('venue attribution remains shareable by different couples and reserves aggregate capacity',async()=>{
  campaign=await create('VENUE','venue_partner',2,uuid(1));first=await reserve(uuid(3),'VENUE');await reserve(uuid(4),'VENUE');
  assert.equal((await reserve(uuid(3),'VENUE')).id,first.id);await quote(uuid(3),'VENUE');
  await assert.rejects(reserve(uuid(5),'VENUE'));await assert.rejects(quote(uuid(5),'VENUE'));
 });
 await check('owner-only exact email lookup returns the existing account name and identifier',async()=>{
  const rows=await admin('search_accounts',{email:' PERSON3@EXAMPLE.TEST '});assert.equal(rows.length,1);assert.equal(rows[0].name,'Person 3');assert.equal(rows[0].account_id,'ACC-3');
  assert.deepEqual(await admin('search_accounts',{email:'absent@example.test'}),[]);
  await assert.rejects(admin('search_accounts',{email:'person'}));await assert.rejects(admin('search_accounts',{email:'person3@example.test'},uuid(2)));
 });
 await check('invalid or unavailable account binding and stray General bindings are rejected',async()=>{
  await assert.rejects(create('MISSING','customer',1));await assert.rejects(create('UNKNOWN','venue_partner',1,uuid(999)));await assert.rejects(create('STRAY','general',1,uuid(2)));
 });
 let evidence;
 await check('verified completion changes reserved to used exactly once',async()=>{
  await db.query("UPDATE private.promotion_redemptions SET stripe_session_id='cs_Test',original_trial_ends_at=now(),livemode=true WHERE id=$1",[first.id]);
  const now=await scalar('select now()::text result');
  evidence={reservation_id:first.id,session_id:'cs_Test',currency:'AUD',livemode:true,amount_subtotal_cents:19900,discount_cents:9950,amount_total_cents:10945,
   completion_event_id:'evt_Test',completed_at:now,payment_intent_id:'pi_Test',payment_status:'paid'};
  const recorded=await scalar('select public.record_verified_promotion_completion($1::jsonb) result',[JSON.stringify(evidence)]);assert.equal(recorded.result,'recorded');
  const replay=await scalar('select public.record_verified_promotion_completion($1::jsonb) result',[JSON.stringify(evidence)]);assert.equal(replay.result,'already_recorded');
  const row=(await admin('list')).find(c=>c.id===campaign.id);assert.deepEqual([row.used,row.reserved,row.remaining],[1,1,0]);
 });
 await check('pause/reactivate preserves completed and reserved usage',async()=>{
  const paused=await admin('set_active',{id:campaign.id,active:false});assert.deepEqual([paused.used,paused.reserved,paused.remaining],[1,1,0]);
  await assert.rejects(reserve(uuid(5),'VENUE'));const active=await admin('set_active',{id:campaign.id,active:true});assert.deepEqual([active.used,active.reserved,active.remaining],[1,1,0]);
 });
 await check('a larger campaign cap never bypasses first-purchase/email eligibility',async()=>{
  await assert.rejects(reserve(uuid(3),'LEGACY'));
  await db.query('UPDATE auth.users SET email=$1 WHERE id=$2',['changed@example.test',uuid(3)]);
  await assert.rejects(reserve(uuid(3),'LEGACY'));await assert.rejects(quote(uuid(3),'LEGACY'));
  await db.query('INSERT INTO public.paid_plan_purchases VALUES($1)',[uuid(5)]);await assert.rejects(reserve(uuid(5),'LEGACY'));await assert.rejects(quote(uuid(5),'LEGACY'));
  await db.query('UPDATE auth.users SET email_confirmed_at=null WHERE id=$1',[uuid(6)]);await assert.rejects(reserve(uuid(6),'LEGACY'));
 });
 await check('100 accepts exactly 100 competing requests; pending holds prevent a 101st',async()=>{
  const capped=await create('HUNDRED','general',100);
  // PGlite queues SQL on one backend: real PostgreSQL logic, not a multi-session contention test.
  const attempts=await Promise.allSettled(Array.from({length:101},(_,i)=>reserve(uuid(i+7),'HUNDRED')));
  assert.equal(attempts.filter(r=>r.status==='fulfilled').length,100);assert.equal(attempts.filter(r=>r.status==='rejected').length,1);
  const row=(await admin('list')).find(c=>c.id===capped.id);assert.deepEqual([row.used,row.reserved,row.remaining],[0,100,0]);
 });
 await check('browser roles cannot call privileged search, management or redemption functions',async()=>{
  await db.exec('SET ROLE authenticated');
  try{await assert.rejects(admin('list'));await assert.rejects(admin('search_accounts',{email:'person3@example.test'}));await assert.rejects(reserve(uuid(2),'LEGACY'));}
  finally{await db.exec('RESET ROLE');}
 });
 await check('deletion hides a campaign, preserves all records and blocks quote/reservation/reactivation and code reuse',async()=>{
  const before=await scalar('select count(*)::integer result from private.promotion_redemptions where campaign_id=$1',[campaign.id]);
  const deleted=await admin('delete',{id:campaign.id});assert.equal(deleted.active,false);assert.ok(deleted.deleted_at);assert.equal(deleted.deleted_by,owner);
  assert.equal((await admin('list')).some(c=>c.id===campaign.id),false);
  assert.equal(await scalar('select count(*)::integer result from private.promotion_redemptions where campaign_id=$1',[campaign.id]),before);
  assert.equal(await scalar("select count(*)::integer result from private.promotion_redemptions where id=$1 and state='completed'",[first.id]),1);
  await assert.rejects(reserve(uuid(2),'VENUE'));await assert.rejects(quote(uuid(2),'VENUE'));
  await assert.rejects(admin('set_active',{id:campaign.id,active:true}));await assert.rejects(create('VENUE'));
  await assert.rejects(db.query('update public.promotion_campaigns set active=true where id=$1',[campaign.id]));
  const again=await admin('delete',{id:campaign.id});assert.equal(again.deleted_at,deleted.deleted_at);
  assert.equal(await scalar("select count(*)::integer result from public.account_lifecycle_audit where action='promotion_delete' and metadata->>'campaign_id'=$1",[campaign.id]),1);
 });
 await check('a reserved checkout can still complete with verified payment evidence after deletion',async()=>{
  const held=await scalar("select id result from private.promotion_redemptions where campaign_id=$1 and state='reserved'",[campaign.id]);
  await db.query("UPDATE private.promotion_redemptions SET stripe_session_id='cs_Deleted',original_trial_ends_at=now(),livemode=true WHERE id=$1",[held]);
  const next={...evidence,reservation_id:held,session_id:'cs_Deleted',payment_intent_id:'pi_Deleted',completion_event_id:'evt_Deleted'};
  assert.equal((await scalar('select public.record_verified_promotion_completion($1::jsonb) result',[JSON.stringify(next)])).result,'recorded');
 });
 await check('legacy and empty paused campaigns can be deleted; unauthorized actors and browser roles cannot delete',async()=>{
  const empty=await create('EMPTY');await admin('set_active',{id:empty.id,active:false});
  await assert.rejects(admin('delete',{id:empty.id},uuid(2)));assert.equal((await admin('list')).some(c=>c.id===empty.id),true);
  await db.exec('SET ROLE authenticated');try{await assert.rejects(admin('delete',{id:empty.id}));}finally{await db.exec('RESET ROLE');}
  await admin('delete',{id:empty.id});const legacy=(await admin('list')).find(c=>c.code==='LEGACY');await admin('delete',{id:legacy.id});
  await assert.rejects(admin('delete',{id:uuid(9999)}));
 });
 if(db.pool) await check('real concurrent deletion serializes with reservation in both lock orders',async()=>{
  const client=await db.pool.connect();
  try {
   const first=await create('DELETERACE');
   await client.query('BEGIN');
   await client.query("select public.admin_manage_promotion($1,'delete',$2::jsonb)",[owner,JSON.stringify({id:first.id})]);
   const attempt=reserve(uuid(108),'DELETERACE');const outcome=assert.rejects(attempt);
   await client.query('COMMIT');await outcome;
   const second=await create('RESERVERACE');
   await client.query('BEGIN');
   const held=(await client.query("select public.reserve_first_purchase_promotion($1,'RESERVERACE','essential') result",[uuid(109)])).rows[0].result;
   const deletion=admin('delete',{id:second.id});
   await client.query('COMMIT');await deletion;
   assert.equal(await scalar("select state result from private.promotion_redemptions where id=$1",[held.id]),'reserved');
   await assert.rejects(reserve(uuid(110),'RESERVERACE'));
  } finally {await client.query('ROLLBACK');client.release();}
 });
 console.log(`PostgreSQL audience/limit checks passed: ${checks}. Isolated fixtures only; no deployment or payment calls.`);
} finally {await db.close();}

