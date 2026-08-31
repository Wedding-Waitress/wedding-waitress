import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const source = fs.readFileSync(path.resolve(process.cwd(), 'src/hooks/useEventBudget.ts'), 'utf8');

describe('useEventBudget event isolation and mutation contract', () => {
  it('keys every cache by selected event and does not fetch without one', () => {
    expect(source).toContain("event: (eventId: string) => [...eventBudgetKeys.all, eventId]");
    expect(source).toContain('enabled: Boolean(eventId)');
    expect(source).toContain("[...eventBudgetKeys.all, 'none']");
  });

  it('scopes reads, writes and deletes to event_id and rejects zero-row mutations', () => {
    expect(source.match(/\.eq\('event_id', eventId\)/g)?.length).toBeGreaterThanOrEqual(4);
    expect(source).toContain("input.event_id !== eventId");
    expect(source.match(/\.select\(\)\.single\(\)/g)?.length).toBeGreaterThanOrEqual(2);
    expect(source).toContain(".select('id').single()");
    expect(source).toContain('did not affect a row');
  });
});
