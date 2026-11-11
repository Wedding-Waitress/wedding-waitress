import fs from 'node:fs';
import assert from 'node:assert/strict';
const { PGlite } = await import(process.env.PROMOTION_PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
const checks = [];
async function check(name, fn) { await fn(); checks.push(name); console.log('PASS ' + name); }
try {
  await db.exec(`CREATE TABLE public.events (
    id integer PRIMARY KEY,
    event_image_position_x smallint NOT NULL DEFAULT 50 CHECK(event_image_position_x BETWEEN 0 AND 100),
    event_image_position_y smallint NOT NULL DEFAULT 50 CHECK(event_image_position_y BETWEEN 0 AND 100),
    event_image_zoom smallint NOT NULL DEFAULT 100 CHECK(event_image_zoom BETWEEN 100 AND 200));
    INSERT INTO events(id) VALUES(1);`);
  const payload = JSON.stringify({id:2,event_image_position_x:51.92307692307692,event_image_position_y:23.148148148148145,event_image_zoom:100});
  const insert = () => db.query('INSERT INTO events SELECT * FROM json_populate_record(NULL::events, $1::json)', [payload]);
  await check('reproduces the exact production 22P02 failure before the migration', async () => {
    await assert.rejects(insert(), e => e.code === '22P02');
  });
  await db.exec(fs.readFileSync('supabase/migrations/20261031031311_event_image_fractional_crop.sql','utf8'));
  await check('accepts the exact saved crop via JSON record input after migration', async () => {
    await insert();
    const row = (await db.query('SELECT event_image_position_x::text x, event_image_position_y::text y FROM events WHERE id=2')).rows[0];
    assert.equal(Number(row.x),51.92307692307692); assert.equal(Number(row.y),23.148148148148145);
  });
  await check('existing integer crops and defaults survive unchanged', async () => {
    const row=(await db.query('SELECT event_image_position_x::text x,event_image_position_y::text y,event_image_zoom::text z FROM events WHERE id=1')).rows[0];
    assert.deepEqual(row,{x:'50',y:'50',z:'100'});
  });
  await check('fractional edits and zoom round-trip without integer rounding', async () => {
    await db.exec('UPDATE events SET event_image_position_x=53.205128205128204,event_image_zoom=137.25 WHERE id=2');
    const row=(await db.query('SELECT event_image_position_x::text x,event_image_zoom::text z FROM events WHERE id=2')).rows[0];
    assert.equal(row.x,'53.205128205128204');assert.equal(row.z,'137.25');
  });
  await check('all crop bounds, invalid numbers and null protections remain enforced', async () => {
    for (const [col,value] of [['event_image_position_x','-0.01'],['event_image_position_x','100.01'],['event_image_position_y','-1'],['event_image_position_y','101'],['event_image_zoom','99.9'],['event_image_zoom','200.1'],['event_image_position_x',"'NaN'"],['event_image_zoom',"'Infinity'"],['event_image_position_x','NULL']]) {
      await assert.rejects(db.exec(`UPDATE events SET ${col}=${value} WHERE id=2`));
    }
  });
  fs.writeFileSync('onboarding-crop-postgres-verification-20261031.json',JSON.stringify({passed:true,checks},null,2));
} finally { await db.close(); }
