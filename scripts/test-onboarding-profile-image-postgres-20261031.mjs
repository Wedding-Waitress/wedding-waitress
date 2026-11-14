import fs from 'node:fs';import assert from 'node:assert/strict';
const{PGlite}=await import(process.env.PROMOTION_PGLITE_MODULE||'@electric-sql/pglite'),db=new PGlite(),checks=[];
const u='00000000-0000-4000-8000-000000000001',v='00000000-0000-4000-8000-000000000002',id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const call=async n=>(await db.query('select public.seed_onboarding_profile_image($1) result',[id(n)])).rows[0].result;
async function check(n,f){await f();checks.push(n);console.log('PASS '+n);}
try{
 await db.exec(`CREATE ROLE authenticated;CREATE ROLE anon;CREATE ROLE service_role;CREATE SCHEMA auth;CREATE SCHEMA storage;
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('test.actor',true),'')::uuid$$;
 CREATE TABLE public.profiles(id uuid PRIMARY KEY,profile_image_path text,profile_image_fit text,profile_image_position_x smallint,profile_image_position_y smallint);
 CREATE TABLE public.onboarding_drafts(id uuid PRIMARY KEY,user_id uuid,mode text,answers jsonb,completed_at timestamptz);
 CREATE TABLE storage.objects(id uuid DEFAULT gen_random_uuid(),bucket_id text,name text,user_metadata jsonb);
 ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;ALTER TABLE onboarding_drafts ENABLE ROW LEVEL SECURITY;ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
 GRANT USAGE ON SCHEMA public,auth,storage TO authenticated;GRANT SELECT,UPDATE ON profiles,onboarding_drafts,storage.objects TO authenticated;
 CREATE POLICY own_profile ON profiles TO authenticated USING(id=auth.uid()) WITH CHECK(id=auth.uid());
 CREATE POLICY own_draft ON onboarding_drafts TO authenticated USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());
 CREATE POLICY own_object ON storage.objects TO authenticated USING(bucket_id='profile-images' AND name=auth.uid()::text||'/profile-image');
 INSERT INTO profiles VALUES('${u}',null,'cover',50,50),('${v}','${v}/profile-image','cover',50,50);`);
 await db.exec(fs.readFileSync('supabase/migrations/20261031035008_seed_private_profile_image_from_onboarding.sql','utf8'));
 for(let n=10;n<=18;n++)await db.query('INSERT INTO onboarding_drafts(id,user_id,mode,answers) VALUES($1,$2,$3,$4)',[id(n),n===18?v:u,n===11?'additional_event':'first_event',JSON.stringify(n===12?{}:{eventImagePath:u+'/drafts/'+id(n)+'/photo.jpg',eventImageFit:'contain',eventImagePositionX:51.92307692307692,eventImagePositionY:23.148148148148145})]);
 await db.exec(`SET test.actor='${u}';SET ROLE authenticated`);
 await check('new first-event image requests an independent owner private copy',async()=>{assert.deepEqual(await call(10),{status:'copy_required',source_path:u+'/drafts/'+id(10)+'/photo.jpg',target_path:u+'/profile-image'});});
 await check('additional/no-photo drafts skip; foreign draft and anonymous calls are denied',async()=>{assert.equal((await call(11)).status,'skipped');assert.equal((await call(12)).status,'skipped');await assert.rejects(call(18),e=>e.code==='42501');await db.exec('RESET ROLE;SET ROLE anon');await assert.rejects(call(10),e=>e.code==='42501');await db.exec('RESET ROLE;SET ROLE authenticated');});
 await db.exec('RESET ROLE');await db.query('INSERT INTO storage.objects(bucket_id,name,user_metadata)VALUES($1,$2,$3)',['profile-images',u+'/profile-image',JSON.stringify({onboarding_draft_id:id(10),source_path:u+'/drafts/'+id(10)+'/photo.jpg'})]);await db.exec('SET ROLE authenticated');
 await check('provenance-verified copy atomically populates private profile with safe crop values',async()=>{assert.equal((await call(10)).status,'seeded');const p=(await db.query('SELECT * FROM profiles')).rows[0];assert.equal(p.profile_image_path,u+'/profile-image');assert.equal(p.profile_image_fit,'contain');assert.equal(p.profile_image_position_x,52);assert.equal(p.profile_image_position_y,23);});
 await check('retry after explicit private removal does not resurrect or overwrite the image',async()=>{await db.query('UPDATE profiles SET profile_image_path=NULL WHERE id=$1',[u]);assert.equal((await call(10)).status,'skipped');assert.equal((await db.query('SELECT profile_image_path FROM profiles')).rows[0].profile_image_path,null);});
 await check('existing profile and independent object always win; no event file is linked',async()=>{await db.query('UPDATE profiles SET profile_image_path=$2 WHERE id=$1',[u,u+'/profile-image']);assert.equal((await call(13)).status,'preserved');await db.query('UPDATE profiles SET profile_image_path=NULL WHERE id=$1',[u]);assert.equal((await call(14)).status,'preserved');assert.equal((await db.query('SELECT profile_image_path FROM profiles')).rows[0].profile_image_path,null);});
 await check('completed onboarding is never backfilled',async()=>{await db.query('UPDATE onboarding_drafts SET completed_at=now() WHERE id=$1',[id(15)]);assert.equal((await call(15)).status,'skipped');});
 await check('RPC retains invoker security and exposes execution only to authenticated owners',async()=>{await db.exec('RESET ROLE');const p=(await db.query("SELECT prosecdef FROM pg_proc WHERE proname='seed_onboarding_profile_image'")).rows[0];assert.equal(p.prosecdef,false);const access=(await db.query("SELECT has_function_privilege('anon','public.seed_onboarding_profile_image(uuid)','EXECUTE') anon,has_function_privilege('service_role','public.seed_onboarding_profile_image(uuid)','EXECUTE') service_role")).rows[0];assert.deepEqual(access,{anon:false,service_role:false});});
 fs.writeFileSync('onboarding-profile-image-postgres-verification-20261031.json',JSON.stringify({passed:true,checks},null,2));
}finally{await db.close();}
