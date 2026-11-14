// Exact scoped schema replay in disposable PostgreSQL. Hosted APIs are never used.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const modulePath=process.env.WW_PGLITE_MODULE||'@electric-sql/pglite';
const {PGlite}=require(modulePath);
const {pgcrypto}=require(path.join(modulePath,'dist/contrib/pgcrypto.cjs'));
const root=path.resolve(process.argv[2]||process.cwd());
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const evidence=JSON.parse(read('supabase/rebuild/recovery-evidence.json'));
const acl=JSON.parse(read('supabase/permissions/data-api-baseline.json'));
const q=s=>'"'+s.replaceAll('"','""')+'"';
const policyDeps=['admin_deleted_planning_blocked','closed_account_planning_blocked','customer_entitlement_blocked','account_planning_blocked'];
(async()=>{
 const db=new PGlite({extensions:{pgcrypto}});
 try{
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
  CREATE SCHEMA auth; CREATE SCHEMA private; CREATE SCHEMA extensions; CREATE EXTENSION pgcrypto WITH SCHEMA extensions;
  CREATE TABLE auth.users(id uuid PRIMARY KEY);
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
  CREATE FUNCTION public.has_platform_owner_access() RETURNS boolean LANGUAGE sql AS $$SELECT false$$;
  CREATE TABLE public.events(id uuid PRIMARY KEY,user_id uuid,slug text,qr_apply_to_live_view boolean DEFAULT false);
  CREATE TABLE public.qr_code_settings(id uuid PRIMARY KEY);
  CREATE TABLE public.venue_floor_plan_requests(id uuid PRIMARY KEY);
  CREATE TABLE public.venue_floor_plan_templates(id uuid PRIMARY KEY,room_name text);
  CREATE TABLE public.reception_floor_plans(id uuid PRIMARY KEY,event_id uuid,user_id uuid,updated_at timestamptz,
    table_positions jsonb,fixtures jsonb,vendor_notes text,manual_placement boolean,background_x numeric,background_y numeric,
    background_width numeric,background_height numeric,background_rotation numeric,background_opacity numeric,background_locked boolean,
    background_visible boolean,last_saved_at timestamptz);
  CREATE FUNCTION public.can_access_event(who uuid,event uuid) RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$SELECT EXISTS(SELECT 1 FROM public.events WHERE id=event AND user_id=who)$$;
  CREATE FUNCTION public.canonicalize_event_row_owner() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN RETURN NEW; END$$;
  CREATE FUNCTION public.guard_expired_event_mutation() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW; END$$;
  GRANT USAGE ON SCHEMA public,auth,private TO anon,authenticated,service_role;
  GRANT SELECT ON public.events TO anon,authenticated,service_role;`);
  for(const name of policyDeps)await db.exec(`CREATE FUNCTION private.${name}(uuid) RETURNS boolean LANGUAGE sql AS $$SELECT current_setting('fixture.blocked',true)='yes'$$;`);
  await db.exec("CREATE FUNCTION private.prelaunch_access_allowed(uuid) RETURNS boolean LANGUAGE sql AS $$SELECT true$$;");
  await db.exec(evidence.tables.functions.find(f=>f.name==='update_updated_at_column').definition+';');
  const recovered=evidence.sources.filter(s=>s.scope!=='earlyHistoryRepair').sort((a,b)=>a.replayVersion.localeCompare(b.replayVersion));
  for(const source of recovered)await db.exec(read('supabase/rebuild/recovered-history/'+source.file));
  // Unrelated relations are deliberately only privilege fixtures, as in the ACL
  // test. This is not a full application migration replay.
  const existing=new Set([...evidence.tables.tables.map(t=>t.name),'events','qr_code_settings','venue_floor_plan_requests','venue_floor_plan_templates','reception_floor_plans']);
  for(const t of acl.tables)if(!existing.has(t.name))await db.exec(`CREATE TABLE public.${q(t.name)}(id bigint PRIMARY KEY); ALTER TABLE public.${q(t.name)} ENABLE ROW LEVEL SECURITY;`);
  for(const s of acl.sequences)await db.exec(`CREATE SEQUENCE public.${q(s.name)};`);
  await db.exec(read('supabase/migrations/'+acl.migration));
  const security=read('supabase/migrations/'+evidence.securityMigration);
  await db.exec('SET search_path=pg_catalog,public,extensions;');
  // PG18 catalogs NOT NULL separately; PG17 records it only in attnotnull.
  // Column nullability is compared in both engines, without double counting.
  const catalogQuery=evidence.catalogQuery.replace('where co.conrelid=c.oid',"where co.conrelid=c.oid and co.contype<>'n'");
  await db.exec(security);
  // Query the same PostgreSQL catalogs used for the read-only production capture.
  const compare=async()=>{
   const actual=(await db.query(catalogQuery)).rows[0].snapshot;
   assert.deepEqual(actual.tables,evidence.tables.tables,'columns, defaults, constraints, indexes, RLS flags, policies, triggers and ownership');
   for(const f of evidence.tables.functions.filter(f=>f.name!=='update_updated_at_column')){
    const current=actual.functions.find(a=>a.name===f.name);
    assert.equal(current.definition,f.definition,`${f.name} exact function definition`);
    for(const role of ['anon','authenticated','service_role']){
     const expected=f.acl.includes('{=X/')||f.acl.includes(',=X/')||f.acl.includes(role+'=X/');
     const granted=(await db.query('SELECT has_function_privilege($1,$2,\'EXECUTE\') AS allowed',[role,`public.${f.name}(${f.arguments.replace(/(?:_\w+)\s+/g,'')})`])).rows[0].allowed;
     assert.equal(granted,expected,`${f.name}/${role} execute privilege`);
    }
   }
  };
  await compare(); await db.exec(security); await compare();
  // Deliberate structural drift must fail and roll back rather than be erased.
  await db.exec('ALTER TABLE public.qr_design_presets ADD COLUMN unexpected text;');
  await assert.rejects(db.exec(security),/differs from reviewed schema/);
  await db.exec('ROLLBACK; ALTER TABLE public.qr_design_presets DROP COLUMN unexpected;');
  await compare();
  const owner='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222',event='33333333-3333-4333-8333-333333333333';
  await db.exec(`INSERT INTO auth.users VALUES('${owner}'),('${other}'); INSERT INTO public.events(id,user_id,slug) VALUES('${event}','${owner}','owner-event'); INSERT INTO public.qr_design_presets(user_id,event_id,name,design_data) VALUES('${owner}','${event}','fixture','{}'); SET fixture.blocked='no'; SET request.jwt.claim.sub='${owner}'; SET ROLE authenticated;`);
  assert.equal((await db.query('SELECT * FROM public.qr_design_presets')).rows.length,1);
  await db.exec(`SET request.jwt.claim.sub='${other}';`);
  assert.equal((await db.query('SELECT * FROM public.qr_design_presets')).rows.length,0);
  await db.exec(`SET request.jwt.claim.sub='${owner}'; SET fixture.blocked='yes';`);
  assert.equal((await db.query('SELECT * FROM public.qr_design_presets')).rows.length,0);
  await assert.rejects(db.query('SELECT * FROM public.reception_collaborator_contacts'),/permission denied/);
  await db.exec('RESET ROLE; SET fixture.blocked=\'no\';');
  await assert.rejects(db.query(`INSERT INTO public.floor_plan_share_tokens(event_id,user_id,kind,permission) VALUES('${event}','${owner}','ceremony','can_edit')`),/ceremony_view_only/);
  await assert.rejects(db.query("SELECT public.save_reception_collaborator_draft('invalid','{}',0,false,now())"),/Editing permission expired/);
  assert.equal((await db.query('SELECT * FROM public.event_shortlinks')).rows.length,1,'event trigger creates shortlink');
  await db.exec(`DELETE FROM public.events WHERE id='${event}';`);
  assert.equal((await db.query('SELECT * FROM public.event_shortlinks')).rows.length,0,'event deletion cascades');
  console.log('PASS: nine original migrations replay; all six table catalogs and four function bodies match live metadata; 52 policies, five triggers, FKs/indexes/defaults, EXECUTE permissions, repeat application and drift rejection; owner/outsider/block and cascade checks. External parent/auth/entitlement helpers are fixtures.');
 }finally{await db.close();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
