import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = fs.readFileSync(path.resolve(process.cwd(), 'supabase/migrations/20260902071302_guided_event_setup.sql'), 'utf8');
const service = fs.readFileSync(path.resolve(process.cwd(), 'src/lib/guidedEventSetup.ts'), 'utf8');

describe('Guided Event Setup migration contract', () => {
  it('keeps resumable drafts owner-only and authenticated', () => {
    expect(migration).toContain('ALTER TABLE public.onboarding_drafts ENABLE ROW LEVEL SECURITY');
    expect(migration).toContain('GRANT SELECT, INSERT, UPDATE ON TABLE public.onboarding_drafts TO authenticated');
    expect(migration).not.toMatch(/GRANT[^;]*DELETE[^;]*onboarding_drafts/i);
    expect(migration).not.toMatch(/onboarding_drafts FOR DELETE TO authenticated/i);
    expect(migration.match(/\(SELECT auth\.uid\(\)\) = user_id/g)?.length).toBeGreaterThanOrEqual(3);
  });

  it('rejects cross-owner draft and event relationships with composite foreign keys', () => {
    expect(migration).toContain('CONSTRAINT events_id_user_id_key UNIQUE (id, user_id)');
    expect(migration).toContain('CONSTRAINT onboarding_drafts_id_user_id_key UNIQUE (id, user_id)');
    expect(migration).toContain('FOREIGN KEY (created_event_id, user_id)');
    expect(migration).toContain('REFERENCES public.events(id, user_id)');
    expect(migration).toContain('FOREIGN KEY (onboarding_draft_id, user_id)');
    expect(migration).toContain('REFERENCES public.onboarding_drafts(id, user_id)');
    expect(migration).toContain('ON DELETE SET NULL (created_event_id)');
    expect(migration).toContain('ON DELETE SET NULL (onboarding_draft_id)');
    expect(migration).not.toContain('SECURITY DEFINER');
  });

  it('provides database-level creation idempotency and semantic budget state', () => {
    expect(migration).toContain('events_onboarding_draft_id_uidx');
    expect(migration).toContain("planned_budget_kind IN ('exact', 'range', 'undecided')");
    expect(migration).toContain('event_budget_settings_range_state_check');
    expect(service).toContain(".eq('onboarding_draft_id', draft.id).maybeSingle()");
    expect(service).toContain(".select('table_no, table_purpose').eq('event_id', eventId)");
    expect(service).toContain("{ onConflict: 'event_id' }");
    expect(service.indexOf(".eq('onboarding_draft_id', draft.id).maybeSingle()")).toBeLessThan(service.indexOf('const allowance = await getEventAllowanceSnapshot()'));
  });
});
