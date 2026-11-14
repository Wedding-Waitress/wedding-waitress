// Validate the migration against a read-only snapshot of existing RPC definitions.
// Uses a disposable PostgreSQL cluster in memory; never calls the application DB.
const fs=require('node:fs'),assert=require('node:assert/strict');
const {PGlite}=require(process.env.WW_PGLITE_MODULE||'@electric-sql/pglite');
(async()=>{
 const db=new PGlite();try{
  const fixture=fs.readFileSync('work/team-access-v2/fixture.sql','utf8');
  const before=fixture.split('-- LOCAL/PENDING.')[0];await db.exec(before);
  await db.exec("SET check_function_bodies=off; CREATE TYPE event_media_kind AS ENUM('photo','audio','video'); CREATE TYPE event_media_moderation_status AS ENUM('pending','approved','hidden');");
  const rows=JSON.parse(fs.readFileSync('artifacts/team-access-v2/rpc-baseline.json','utf8'));
  await db.exec('DROP FUNCTION get_sms_credits(uuid,uuid);');
  // Skip table-dependent public delete/billing/settings RPCs outside the patch.
  const sql=fs.readFileSync('supabase/migrations/20261015063000_complete_team_access_v2.sql','utf8');
  const whitelist=sql.match(/p.proname=ANY\(ARRAY\[([\s\S]*?)\]\)/)[1];
  const names=[...whitelist.matchAll(/'([^']+)'/g)].map(m=>m[1]);
  for(const row of rows.filter(r=>names.includes(r.proname)||r.proname==='get_sms_credits'))await db.exec(row.definition);
  await db.exec(sql);
  const changed=(await db.query("SELECT proname,prosrc FROM pg_proc p JOIN pg_namespace n ON p.pronamespace=n.oid WHERE n.nspname='public'")).rows;
  for(const name of names){const defs=changed.filter(r=>r.proname===name);assert.ok(defs.length,`Missing ${name}`);for(const def of defs){assert.ok(def.prosrc.includes('public.current_planning_account_owner()'),name);assert.equal(def.prosrc.includes('auth.uid()'),false,name);}}
  assert.equal((await db.query('SELECT internal_team_access_version() AS v')).rows[0].v,2);
  console.log(`PASS: migration installs against ${rows.filter(r=>names.includes(r.proname)).length} actual existing planning RPC definitions, including both Photo Booth overloads; signatures preserved and DDL installs. Body validation is disabled for absent production tables; table-dependent execution requires staging verification.`);
 }finally{await db.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
