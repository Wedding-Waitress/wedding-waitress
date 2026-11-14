// Runs synthetic authorization fixtures locally and rolls every change back.
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
const files = [
  'supabase/tests/guest_invitation_lookup.fixture.sql',
  'supabase/tests/guest_details_authorization.fixture.sql',
  'supabase/migrations/20260920114502_authorized_guest_details_editor.sql',
  'supabase/tests/guest_details_authorization.behavior.sql',
];
const guard = `DO $$ BEGIN IF current_database()<>'designated_cleanup_validation' OR inet_server_addr()<>'127.0.0.1'::inet THEN RAISE EXCEPTION 'Local fixture required'; END IF; END $$; BEGIN;`;
const input = [guard, ...files.map(path => fs.readFileSync(path, 'utf8')), 'ROLLBACK;'].join('\n');
const result = spawnSync('work/postgresql-17.11-portable/pgsql/bin/psql.exe', ['-X', '-w', '-v', 'ON_ERROR_STOP=1', '-h', '127.0.0.1', '-p', '5432', '-U', 'postgres', '-d', 'designated_cleanup_validation'], { input, encoding: 'utf8', windowsHide: true });
process.stdout.write(result.stdout || '');
process.stderr.write(result.stderr || '');
if (result.error) console.error(result.error.message);
process.exitCode = result.status ?? 1;
