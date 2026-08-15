#!/usr/bin/env node
/**
 * check-event-storage.mjs
 *
 * Fails if any source file outside `src/hooks/useSelectedEvent.ts` references
 * the unified event-id storage key or the legacy keys it migrates from.
 * Enforces useSelectedEvent as the single source of truth for event selection.
 */
import { execSync } from 'node:child_process';

const ALLOWED = new Set([
  'src/hooks/useSelectedEvent.ts',
  'src/hooks/useSelectedEvent.test.ts',
]);

const PATTERNS = [
  String.raw`ww:selected_event_id`,
  String.raw`ww:session_selected_event`,
  String.raw`\bactive_event_id\b`,
];

let failed = false;
for (const pattern of PATTERNS) {
  let out = '';
  try {
    out = execSync(`rg -n --no-heading "${pattern}" src/`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch (e) {
    // rg exits 1 when there are no matches — that is success
    if (e.status === 1) continue;
    throw e;
  }
  const offending = out
    .split('\n')
    .filter(Boolean)
    .filter((line) => {
      const file = line.split(':')[0].replaceAll('\\', '/');
      return !ALLOWED.has(file) && !/\.test\.[^/]+$/.test(file);
    });
  if (offending.length > 0) {
    failed = true;
    console.error(`\n[check:storage] Forbidden reference to "${pattern}" outside useSelectedEvent.ts:`);
    for (const l of offending) console.error('  ' + l);
  }
}

if (failed) {
  console.error('\nAll event-selection storage MUST go through src/hooks/useSelectedEvent.ts.');
  process.exit(1);
}
console.log('[check:storage] OK — useSelectedEvent is the only event-selection storage owner.');
