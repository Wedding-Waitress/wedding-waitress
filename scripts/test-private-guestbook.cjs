// Isolated PostgreSQL only. Never connects to Supabase or applies a live migration.
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { PGlite } = require(process.env.WW_PGLITE_MODULE || '@electric-sql/pglite');
(async () => {
 const db = new PGlite();
 const event='00000000-0000-0000-0000-000000000001';
 const gallery='00000000-0000-0000-0000-000000000002';
 const owner='00000000-0000-0000-0000-000000000003';
 let seq=10;
 const id=()=>`00000000-0000-0000-0000-${String(seq++).padStart(12,'0')}`;
 try {
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
   CREATE SCHEMA auth; CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT '${owner}'::uuid $$;
   CREATE TYPE public.event_media_kind AS ENUM ('photo','audio','video');
   CREATE TABLE events(id uuid PRIMARY KEY,user_id uuid);
   CREATE TABLE event_media_galleries(id uuid PRIMARY KEY,event_id uuid,user_id uuid,is_open boolean DEFAULT true,guestbook_auto_share boolean DEFAULT true);
   CREATE TABLE event_media_upload_tokens(token text,gallery_id uuid,expires_at timestamptz);
   CREATE TABLE event_guestbook_messages(id uuid PRIMARY KEY,gallery_id uuid,event_id uuid,uploader_name text,message text,created_at timestamptz DEFAULT now(),shared_to_gallery boolean DEFAULT false,moderation_status text DEFAULT 'approved');
   CREATE TABLE event_media_items(id uuid PRIMARY KEY,gallery_id uuid,event_id uuid,kind event_media_kind,mime_type text,storage_path text,duration_sec integer,uploader_name text,caption text,
    uploaded_at timestamptz DEFAULT now(),created_at timestamptz DEFAULT now(),like_count integer DEFAULT 0,album text,share_photo_seq integer,share_video_seq integer,source_category text DEFAULT 'guest_upload',is_photo_booth_strip boolean DEFAULT false,photo_booth_seq integer,
    upload_status text DEFAULT 'uploaded',moderation_status text DEFAULT 'approved',is_guestbook boolean DEFAULT false,is_photo_booth boolean DEFAULT false,shared_to_gallery boolean DEFAULT false,shared_to_slideshow boolean DEFAULT false);
   INSERT INTO events VALUES('${event}','${owner}');
   INSERT INTO event_media_galleries(id,event_id,user_id) VALUES('${gallery}','${event}','${owner}');
   INSERT INTO event_media_upload_tokens VALUES('valid','${gallery}',NULL),('expired','${gallery}',now()-interval '1 day');
   CREATE FUNCTION test_category() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
    IF NEW.source_category='video_wishes' THEN RETURN NEW; END IF;
    NEW.source_category:=CASE WHEN NEW.is_guestbook THEN 'guestbook_recording' WHEN NEW.is_photo_booth THEN 'photo_booth' ELSE 'guest_upload' END; RETURN NEW; END $$;
   CREATE TRIGGER trg_event_media_items_source_category BEFORE INSERT OR UPDATE ON event_media_items FOR EACH ROW EXECUTE FUNCTION test_category();
  `);
  const insertMedia=async(kind,extra={})=>{
   const row={id:id(),event_id:event,gallery_id:gallery,kind,storage_path:`${event}/original-${seq}.webm`,...extra};
   const keys=Object.keys(row);
   await db.query(`INSERT INTO event_media_items(${keys.join(',')}) VALUES(${keys.map((_,i)=>'$'+(i+1)).join(',')})`,Object.values(row));return row.id;
  };
  const legacy=await insertMedia('video',{is_guestbook:true,shared_to_gallery:true,shared_to_slideshow:true});
  const legacyText=id();
  await db.query('INSERT INTO event_guestbook_messages(id,event_id,gallery_id,message,shared_to_gallery) VALUES($1,$2,$3,$4,true)',[legacyText,event,gallery,'Preserved message']);
  const before=(await db.query('SELECT * FROM event_media_items WHERE id=$1',[legacy])).rows;
  await db.exec(fs.readFileSync('supabase/migrations/20261015030540_fix_guestbook_recording_auto_share.sql','utf8'));
  await db.exec(fs.readFileSync('supabase/migrations/20261015031952_enforce_private_digital_guestbook.sql','utf8'));
  assert.deepEqual((await db.query('SELECT * FROM event_media_items WHERE id=$1',[legacy])).rows,before,'Migration preserves original recording, path, metadata and inert legacy flags');
  for(const setting of [true,false]){
   await db.query('UPDATE event_media_galleries SET guestbook_auto_share=$1',[setting]);
   for(const kind of ['audio','video']){
    const item=await insertMedia(kind,{is_guestbook:true});
    let row=(await db.query('SELECT * FROM event_media_items WHERE id=$1',[item])).rows[0];
    assert.equal(row.source_category,'guestbook_recording');assert.equal(row.shared_to_gallery,false);assert.equal(row.shared_to_slideshow,false);
    await assert.rejects(db.query('UPDATE event_media_items SET shared_to_gallery=true WHERE id=$1',[item]),/cannot be published/);
    await assert.rejects(db.query('UPDATE event_media_items SET shared_to_slideshow=true WHERE id=$1',[item]),/cannot be published/);
    await assert.rejects(db.query("UPDATE event_media_items SET is_guestbook=false,source_category='guest_upload' WHERE id=$1",[item]),/cannot be reclassified/);
    await assert.rejects(db.query('SELECT set_event_media_guestbook_share($1,true)',[item]),/cannot be published/);
   }
   const text=id();await db.query('INSERT INTO event_guestbook_messages(id,event_id,gallery_id,message) VALUES($1,$2,$3,$4)',[text,event,gallery,'New private text']);
   await assert.rejects(db.query('UPDATE event_guestbook_messages SET shared_to_gallery=true WHERE id=$1',[text]),/cannot be published/);
   assert.equal((await db.query('SELECT get_guestbook_auto_share($1) AS flag',[event])).rows[0].flag,false);
   await assert.rejects(db.query('SELECT set_guestbook_auto_share($1,true)',[event]),/retired/);
  }
  const upload=await insertMedia('photo');const video=await insertMedia('video');const booth=await insertMedia('photo',{is_photo_booth:true});
  await insertMedia('photo',{moderation_status:'hidden'});await insertMedia('video',{upload_status:'pending'});
  const wish=await insertMedia('video',{is_guestbook:true,source_category:'video_wishes',shared_to_gallery:true,shared_to_slideshow:true});
  assert.equal((await db.query('SELECT shared_to_gallery FROM event_media_items WHERE id=$1',[wish])).rows[0].shared_to_gallery,true,'Video Wishes keeps its separate sharing choices');
  const publicIds=async(token)=>(await db.query('SELECT id FROM get_event_media_items_public($1)',[token])).rows.map(r=>r.id).sort();
  assert.deepEqual(await publicIds('valid'),[upload,video,booth].sort(),'Only uploaded approved ordinary media and booth photos enter gallery/slideshow RPC');
  assert.deepEqual((await db.query("SELECT * FROM get_guestbook_gallery_text('valid')")).rows,[],'Legacy shared written messages are excluded');
  assert.deepEqual(await publicIds('expired'),[]);assert.deepEqual(await publicIds('invalid'),[]);
  await db.exec('UPDATE event_media_galleries SET is_open=false');assert.deepEqual(await publicIds('valid'),[]);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM event_guestbook_messages')).rows[0].n,3,'Written submissions retained');
  assert.equal((await db.query("SELECT count(*)::int AS n FROM event_media_items WHERE source_category='guestbook_recording'")).rows[0].n,5,'All new and old recordings retained for owner retrieval');
  console.log('PASS: PostgreSQL migration; legacy flags; text/audio/video privacy with old auto-share On/Off; publish/reclassification rejection; paths/content retained; moderation; token expiry; closed galleries; ordinary uploads; Photo Booth; separate Video Wishes.');
 } finally {await db.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
