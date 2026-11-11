import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const requested = process.argv[2];
const checks = {
  app: 'tsconfig.app.json',
  tests: 'tsconfig.test.json',
  tooling: 'tsconfig.node.json',
};
if (requested && ![...Object.keys(checks), 'backend'].includes(requested)) {
  throw new Error(`Unknown type check: ${requested}`);
}
let failed = false;
function run(args) {
  const result = spawnSync(process.execPath, args, { cwd: root, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) failed = true;
}
for (const [name, config] of Object.entries(checks)) {
  if (requested && requested !== name) continue;
  process.stdout.write(`Checking ${name}: ${config}\n`);
  run([require.resolve('typescript/bin/tsc'), '-p', config, '--noEmit', '--pretty', 'false']);
}
if (!requested || requested === 'backend') {
  const sourceRoot = path.join(root, 'supabase/functions');
  const files = [];
  function collect(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) collect(fullPath);
      else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) {
        files.push(path.relative(root, fullPath));
      }
    }
  }
  collect(sourceRoot);
  if (!files.length) throw new Error('No backend TypeScript sources found');
  files.sort();
  process.stdout.write(`Checking backend: ${files.length} sources with Deno\n`);
  // Launch the official Node entry point directly, avoiding Windows' .cmd limit.
  // Small groups keep command lines portable while checking every discovered file.
  for (let offset = 0; offset < files.length; offset += 40) {
    run([require.resolve('deno/bin.cjs'), 'check', '--config', 'supabase/functions/deno.json',
      '--no-lock', '--node-modules-dir=none', ...files.slice(offset, offset + 40)]);
  }
}
if (failed) process.exitCode = 1;
else process.stdout.write('Type checks passed.\n');
