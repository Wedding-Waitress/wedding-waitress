// Diagnostic only: replay prepared SQL in a disposable PostgreSQL engine. Minimal
// auth/storage fixtures do not emulate all hosted Supabase services/extensions.
const fs=require('node:fs'),path=require('node:path');
const mod=process.env.WW_PGLITE_MODULE||'@electric-sql/pglite';
const {PGlite}=require(mod),{pgcrypto}=require(path.join(mod,'dist/contrib/pgcrypto.cjs'));
const root=path.resolve(process.argv[2]||'');
if(!process.argv[2]||!fs.existsSync(path.join(root,'rebuild-plan.json')))throw new Error('Pass a prepared disposable rebuild directory.');
(async()=>{
 const db=new PGlite({extensions:{pgcrypto}});let completed=0,current;const candidates=[];
 try{
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS; CREATE ROLE supabase_auth_admin; CREATE ROLE supabase_admin SUPERUSER;
  CREATE SCHEMA auth; CREATE SCHEMA storage; CREATE SCHEMA extensions; CREATE EXTENSION pgcrypto WITH SCHEMA extensions;
  CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,raw_user_meta_data jsonb DEFAULT '{}',raw_app_meta_data jsonb DEFAULT '{}',created_at timestamptz DEFAULT now(),updated_at timestamptz);
  CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean DEFAULT false,file_size_limit bigint,allowed_mime_types text[]);
  CREATE TABLE storage.objects(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),bucket_id text,name text,owner uuid,owner_id text,metadata jsonb,created_at timestamptz,updated_at timestamptz);
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
  CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$SELECT '{}'::jsonb$$;
  CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$SELECT current_user::text$$;
  CREATE FUNCTION storage.foldername(text) RETURNS text[] LANGUAGE sql AS $$SELECT string_to_array($1,'/')$$;
  CREATE FUNCTION storage.filename(text) RETURNS text LANGUAGE sql AS $$SELECT regexp_replace($1,'^.*/','')$$;
  CREATE FUNCTION storage.extension(text) RETURNS text LANGUAGE sql AS $$SELECT regexp_replace($1,'^.*\\.','')$$;
  -- PG18's explicit generated-column publishing avoids a fixture-only error
  -- when historical migrations use REPLICA IDENTITY FULL with stored columns.
  CREATE PUBLICATION supabase_realtime WITH (publish_generated_columns='stored');
  SET search_path=pg_catalog,public,extensions;`);
  const directory=path.join(root,'supabase/migrations');
  const files=fs.readdirSync(directory).filter(n=>n.endsWith('.sql')).sort();
  for(let index=0;index<files.length;index++){
   const file=files[index];current=file;const sql=fs.readFileSync(path.join(directory,file),'utf8');
   try{await db.exec(sql);completed++;}catch(error){
    // Diagnostic suggestion only. Never edits SQL or the saved rebuild plan.
    // A function-only failed attempt can be superseded by the immediately next
    // migration that explicitly drops/recreates the same signature. Report each
    // candidate for review rather than certifying the prepared chain as-is.
    const name=error.hint?.match(/DROP FUNCTION ([a-z_][a-z0-9_]*\([^)]*\))/i)?.[1];
    const next=files[index+1],nextSQL=next?fs.readFileSync(path.join(directory,next),'utf8'):'';
    const clean=sql.replace(/--[^\n]*|\/\*[\s\S]*?\*\//g,'').trim();
    const escaped=name?.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    if(error.code==='42P13'&&name&&/^CREATE\s+OR\s+REPLACE\s+FUNCTION\b/i.test(clean)&&new RegExp('DROP\\s+FUNCTION\\s+(?:IF\\s+EXISTS\\s+)?(?:public\\.)?'+escaped,'i').test(nextSQL)){
     candidates.push({file,replacement:next,reason:`42P13: failed function-only attempt; next migration explicitly drops/recreates ${name}`});continue;
    }
    throw error;
   }
  }
  console.log(JSON.stringify({completed,candidates,fullReplay:candidates.length===0,scope:'SQL replay only with minimal auth/storage fixtures; hosted services not emulated'}));
 }catch(e){
  const report={completed,candidates,failedAt:current,error:e.message,detail:e.detail,hint:e.hint,sqlstate:e.code,fullReplay:false,scope:'Disposable PGlite with minimal auth/storage fixtures; hosted services not emulated'};
  fs.writeFileSync(path.join(root,'schema-replay-result.json'),JSON.stringify(report,null,2)+'\n');
  console.error(JSON.stringify(report,null,2));process.exitCode=1;
 }finally{await db.close();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
