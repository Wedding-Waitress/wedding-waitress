// Disposable PostgreSQL engine only. No connection string, network or hosted DB.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { PGlite } = require(process.env.WW_PGLITE_MODULE || '@electric-sql/pglite');
const root = process.argv[2] || process.cwd();
const baseline = JSON.parse(fs.readFileSync(path.join(root, 'supabase/permissions/data-api-baseline.json'), 'utf8').replace(/^\uFEFF/, ''));
const sql = fs.readFileSync(path.join(root, 'supabase/migrations', baseline.migration), 'utf8');
const quote = s => '"' + s.replaceAll('"', '""') + '"';
(async () => {
  const db = new PGlite();
  try {
    await db.exec('CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;');
    // PostgreSQL starts with no table grants, matching the new platform default.
    for (const t of baseline.tables) {
      assert.equal(t.kind, 'r', 'Extend fixture for non-table relation kinds before refreshing baseline.');
      await db.exec(`CREATE TABLE public.${quote(t.name)} (id bigint PRIMARY KEY); ALTER TABLE public.${quote(t.name)} ENABLE ROW LEVEL SECURITY;`);
    }
    for (const s of baseline.sequences) await db.exec(`CREATE SEQUENCE public.${quote(s.name)};`);
    let checks = 0;
    const verify = async () => {
      for (const [kind, objects, privileges, fn] of [
        ['table', baseline.tables, ['SELECT','INSERT','UPDATE','DELETE'], 'has_table_privilege'],
        ['sequence', baseline.sequences, ['USAGE','SELECT','UPDATE'], 'has_sequence_privilege'],
      ]) for (const object of objects) for (const role of ['anon','authenticated','service_role']) for (const privilege of privileges) {
        const result = await db.query(`SELECT ${fn}($1,$2,$3) AS allowed`, [role, `public.${quote(object.name)}`, privilege]);
        assert.equal(result.rows[0].allowed, object.roles[role].includes(privilege), `${kind} ${object.name}/${role}/${privilege}`);
        checks++;
      }
    };
    await db.exec(sql); await verify();
    // Existing default grants are narrowed back to the exact current ACL matrix.
    await db.exec('GRANT ALL ON ALL TABLES IN SCHEMA public TO anon,authenticated,service_role; GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon,authenticated,service_role;');
    await db.exec(sql); await verify();
    await db.exec(sql); await verify();
    const rls = await db.query("SELECT count(*)::int AS total FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r' AND c.relrowsecurity");
    assert.equal(rls.rows[0].total, baseline.tables.length);
    // Permission and RLS are independent: table grants still cannot read rows
    // without a policy, while server-only support replies reject authenticated.
    await db.exec('INSERT INTO public.guests VALUES(1); SET ROLE authenticated;');
    assert.deepEqual((await db.query('SELECT * FROM public.guests')).rows, []);
    await assert.rejects(db.query('SELECT * FROM public.support_ticket_replies'), /permission denied/);
    await db.exec('RESET ROLE; CREATE POLICY permission_fixture_owner_read ON public.guests FOR SELECT TO authenticated USING(id=1); SET ROLE authenticated;');
    assert.equal((await db.query('SELECT * FROM public.guests')).rows.length, 1);
    await db.exec('RESET ROLE; CREATE TABLE public.future_unexposed(id bigint);');
    assert.equal((await db.query("SELECT has_table_privilege('authenticated','public.future_unexposed','SELECT') AS allowed")).rows[0].allowed, false);
    console.log(`PASS: ${checks} ACL assertions across fresh defaults, legacy defaults and repeat application; RLS and service-only denial; future tables remain unexposed.`);
  } finally { await db.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
