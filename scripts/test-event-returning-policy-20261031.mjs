import fs from 'node:fs';
import assert from 'node:assert/strict';
const { PGlite } = await import(process.env.PROMOTION_PGLITE_MODULE || '@electric-sql/pglite');
const db=new PGlite(), checks=[];
const owner='00000000-0000-4000-8000-000000000001', other='00000000-0000-4000-8000-000000000002', member='00000000-0000-4000-8000-000000000003';
async function check(name,fn){await fn();checks.push(name);console.log('PASS '+name);}
const actor=async(id,planning=id,active=true)=>db.query("SELECT set_config('test.actor',$1,false),set_config('test.owner',$2,false),set_config('test.active',$3,false)",[id,planning,String(active)]);
try {
 await db.exec(`CREATE ROLE authenticated; CREATE SCHEMA auth; GRANT USAGE ON SCHEMA auth TO authenticated;
 CREATE TYPE app_role AS ENUM('admin');
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('test.actor',true),'')::uuid$$;
 CREATE FUNCTION current_planning_account_owner() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('test.owner',true),'')::uuid$$;
 CREATE FUNCTION has_role(uuid,app_role) RETURNS boolean LANGUAGE sql STABLE AS $$SELECT false$$;
 CREATE TABLE events(id integer PRIMARY KEY,user_id uuid NOT NULL);
 ALTER TABLE events ENABLE ROW LEVEL SECURITY;
 GRANT SELECT,INSERT ON events TO authenticated;
 CREATE FUNCTION can_access_event(uuid,integer) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$SELECT EXISTS(SELECT FROM public.events WHERE id=$2 AND user_id=public.current_planning_account_owner())$$;
 CREATE POLICY "Account team reads events" ON events FOR SELECT TO authenticated USING(can_access_event(auth.uid(),id));
 CREATE POLICY "Master creates events" ON events FOR INSERT TO authenticated WITH CHECK(user_id=auth.uid() AND auth.uid()=current_planning_account_owner());
 CREATE POLICY "Active access" ON events AS RESTRICTIVE FOR ALL TO authenticated USING(current_setting('test.active')='true') WITH CHECK(current_setting('test.active')='true');
 INSERT INTO events VALUES(10,'${other}'); SET ROLE authenticated;`);
 await actor(owner);
 await check('reproduces stable self-lookup failure on INSERT RETURNING',async()=>{
  await assert.rejects(db.query('INSERT INTO events VALUES(1,$1) RETURNING id',[owner]),e=>e.code==='42501');
 });
 await db.exec('RESET ROLE');
 await db.exec(fs.readFileSync('supabase/migrations/20261031031318_event_insert_returning_visibility.sql','utf8'));
 await db.exec('SET ROLE authenticated');
 await check('active owner can insert and return the new event id',async()=>{
  assert.equal((await db.query('INSERT INTO events VALUES(1,$1) RETURNING id',[owner])).rows[0].id,1);
 });
 await check('owner cannot read or create another account event',async()=>{
  assert.deepEqual((await db.query('SELECT id FROM events ORDER BY id')).rows,[{id:1}]);
  await assert.rejects(db.query('INSERT INTO events VALUES(2,$1) RETURNING id',[other]),e=>e.code==='42501');
 });
 await check('accepted team mapping reads owner event without creating events as master',async()=>{
  await actor(member,owner);
  assert.deepEqual((await db.query('SELECT id FROM events ORDER BY id')).rows,[{id:1}]);
  await assert.rejects(db.query('INSERT INTO events VALUES(2,$1) RETURNING id',[member]),e=>e.code==='42501');
 });
 await check('restrictive account holds continue blocking reads and inserts',async()=>{
  await actor(owner,owner,false);
  assert.deepEqual((await db.query('SELECT id FROM events')).rows,[]);
  await assert.rejects(db.query('INSERT INTO events VALUES(2,$1) RETURNING id',[owner]),e=>e.code==='42501');
 });
 await check('missing planning-owner mapping provides no owner access',async()=>{
  await actor(member,'');assert.deepEqual((await db.query('SELECT id FROM events')).rows,[]);
 });
 fs.writeFileSync('onboarding-returning-postgres-verification-20261031.json',JSON.stringify({passed:true,checks},null,2));
}finally{await db.close();}
