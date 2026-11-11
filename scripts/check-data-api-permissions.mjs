import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { renderSecurity } from './render-recovered-security.mjs';

export const roles = ['anon', 'authenticated', 'service_role'];
const identifier = '(?:"(?:[^"]|"")+"|[a-z_][a-z0-9_$]*)';
const object = `(?:public\\s*\\.\\s*|"public"\\s*\\.\\s*)?(${identifier})`;
const normalize = value => value.startsWith('"') ? value.slice(1, -1).replaceAll('""', '"') : value.toLowerCase();
const quote = value => `"${value.replaceAll('"', '""')}"`;

// Ignore SQL comments, literals and function bodies; a policy or SQL example is
// not a table privilege. Dynamic DDL still requires manual migration review.
export function statements(sql) {
  return sql.replace(/--[^\n]*|\/\*[\s\S]*?\*\/|'(?:[^']|'')*'|\$(\w*)\$[\s\S]*?\$\1\$/g, ' ').split(';').map(s => s.trim()).filter(Boolean);
}

export function renderBaseline(baseline) {
  const lines = [
    '-- Explicit Data API permissions for the historical migration chain.',
    '-- Read-only production ACL snapshot: 2026-10-22; see docs/DATA_API_PERMISSIONS.md.',
    '-- Named objects only. No default grants, policies, ownership or RLS changes.',
    '-- Revoke/regrant only CRUD (tables) and USAGE/SELECT/UPDATE (sequences).',
    'BEGIN;',
  ];
  for (const [kind, objects, privileges] of [
    ['TABLE', baseline.tables, 'SELECT, INSERT, UPDATE, DELETE'],
    ['SEQUENCE', baseline.sequences, 'USAGE, SELECT, UPDATE'],
  ]) {
    for (const item of objects) {
      const name = `public.${quote(item.name)}`;
      lines.push('', `REVOKE ${privileges} ON ${kind} ${name} FROM anon, authenticated, service_role;`);
      for (const role of roles) {
        if (item.roles[role].length) lines.push(`GRANT ${item.roles[role].join(', ')} ON ${kind} ${name} TO ${role};`);
      }
    }
  }
  lines.push('', "NOTIFY pgrst, 'reload schema';", 'COMMIT;', '');
  return lines.join('\n');
}

export function lintMigration(sql) {
  const chunks = statements(sql);
  const errors = [];
  const decisions = { TABLE: new Map(), SEQUENCE: new Map() };
  const add = (kind, name, role) => {
    const entries = decisions[kind].get(name) || new Set();
    entries.add(role); decisions[kind].set(name, entries);
  };
  for (const s of chunks) {
    if (/\balter\s+default\s+privileges\b[\s\S]*\bgrant\b/i.test(s) || /\bgrant\b[\s\S]*\bon\s+all\s+(tables|sequences)\b/i.test(s)) {
      errors.push('Use named-object grants; automatic or schema-wide grants are forbidden.');
    }
    const permission = s.match(new RegExp(`^(GRANT|REVOKE)\\s+([\\s\\S]+?)\\s+ON\\s+(?:(TABLE|SEQUENCE)\\s+)?([\\s\\S]+?)\\s+(?:TO|FROM)\\s+([\\s\\S]+)$`, 'i'));
    if (!permission || /\b(function|schema|procedure|type|routine)\b/i.test(permission[4])) continue;
    const kind = (permission[3] || 'TABLE').toUpperCase();
    for (const target of permission[4].split(',')) {
      const match = target.trim().match(new RegExp(`^${object}$`, 'i'));
      if (!match) continue;
      for (const r of permission[5].split(',').map(s => normalize(s.trim()))) {
        if (roles.includes(r)) add(kind, normalize(match[1]), r);
      }
    }
  }
  const check = (kind, name) => {
    for (const role of roles) if (!decisions[kind].get(name)?.has(role)) errors.push(`${kind.toLowerCase()} public.${name}: explicit GRANT or REVOKE missing for ${role}.`);
  };
  for (const s of chunks) {
    const table = s.match(new RegExp(`^CREATE\\s+(?:UNLOGGED\\s+)?TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?${object}\\s*\\(`, 'i'));
    if (table) {
      const name = normalize(table[1]);
      check('TABLE', name);
      const enabled = chunks.some(chunk => {
        const match = chunk.match(new RegExp(`^ALTER\\s+TABLE\\s+(?:ONLY\\s+)?${object}\\s+ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY$`, 'i'));
        return match && normalize(match[1]) === name;
      });
      if (!enabled) errors.push(`table public.${name}: ENABLE ROW LEVEL SECURITY missing.`);
      const columns = s.slice(table[0].length).split(',');
      for (const column of columns) {
        const auto = column.trim().match(new RegExp(`^(${identifier})\\s+(?:(?:small|big)?serial\\b|[\\s\\S]*?\\bGENERATED\\s+(?:ALWAYS|BY\\s+DEFAULT)\\s+AS\\s+IDENTITY\\b)`, 'i'));
        if (auto) check('SEQUENCE', `${name}_${normalize(auto[1])}_seq`);
      }
    }
    if (!table && new RegExp(`^CREATE\\s+(?:UNLOGGED\\s+)?TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?${object}(?:\\s|$)`, 'i').test(s)) {
      errors.push('Public CREATE TABLE form requires checker support before merging (for example AS or PARTITION OF).');
    }
    const sequence = s.match(new RegExp(`^CREATE\\s+SEQUENCE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?${object}(?:\\s|$)`, 'i'));
    if (sequence) check('SEQUENCE', normalize(sequence[1]));
    // Adding an identity/serial column also creates a sequence.
    const added = s.match(new RegExp(`^ALTER\\s+TABLE\\s+${object}\\s+ADD\\s+(?:COLUMN\\s+)?(${identifier})\\s+(?:(?:small|big)?serial\\b|[\\s\\S]*?\\bGENERATED\\s+(?:ALWAYS|BY\\s+DEFAULT)\\s+AS\\s+IDENTITY\\b)`, 'i'));
    if (added) check('SEQUENCE', `${normalize(added[1])}_${normalize(added[2])}_seq`);
  }
  return errors;
}

export function checkRepository(root) {
  const baseline = JSON.parse(fs.readFileSync(path.join(root, 'supabase/permissions/data-api-baseline.json'), 'utf8').replace(/^\uFEFF/, ''));
  const directory = path.join(root, 'supabase/migrations');
  const actual = fs.readFileSync(path.join(directory, baseline.migration), 'utf8').replaceAll('\r\n', '\n');
  const errors = [];
  const recoveryFile = path.join(root, 'supabase/rebuild/recovery-evidence.json');
  if (fs.existsSync(recoveryFile)) {
    const recovery = JSON.parse(fs.readFileSync(recoveryFile, 'utf8'));
    if (fs.readFileSync(path.join(directory, recovery.securityMigration), 'utf8').replaceAll('\r\n', '\n') !== renderSecurity(recovery)) errors.push('Recovered security migration differs from reviewed live catalog evidence.');
    for (const source of recovery.sources) {
      if (fs.readFileSync(path.join(root, 'supabase/rebuild/recovered-history', source.file), 'utf8').replaceAll('\r\n', '\n') !== source.statements.join('\n')+'\n') errors.push(`Recovered original differs from live migration evidence: ${source.file}`);
    }
  }
  if (actual !== renderBaseline(baseline)) errors.push('Historical permissions migration differs from reviewed ACL baseline.');
  const files = fs.readdirSync(directory).filter(name => name.endsWith('.sql')).sort();
  for (const [name, digest] of Object.entries(baseline.historicalMigrations)) {
    if (!files.includes(name)) { errors.push(`Historical migration removed: ${name}`); continue; }
    const current = fs.readFileSync(path.join(directory, name), 'utf8').replaceAll('\r\n', '\n');
    if (crypto.createHash('sha256').update(current).digest('hex') !== digest) errors.push(`Historical migration changed: ${name}. Add a new migration instead of rewriting the baseline chain.`);
  }
  const future = files.filter(name => name !== baseline.migration && !Object.hasOwn(baseline.historicalMigrations, name));
  for (const name of future) for (const error of lintMigration(fs.readFileSync(path.join(directory, name), 'utf8'))) errors.push(`${name}: ${error}`);
  return { errors, checked: future.length, baseline };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = checkRepository(process.cwd());
  if (result.errors.length) { console.error(result.errors.join('\n')); process.exitCode = 1; }
  else console.log(`PASS: historical ACL baseline (${result.baseline.tables.length} tables, ${result.baseline.sequences.length} sequences); ${result.checked} subsequent migrations checked.`);
}
