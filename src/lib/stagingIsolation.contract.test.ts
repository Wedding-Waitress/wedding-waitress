import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('QA branch Supabase isolation', () => {
  it('targets staging and never the production project in Supabase CLI config', () => {
    const config = readFileSync('supabase/config.toml', 'utf8');

    expect(config).toContain('project_id = "ufmpxsgncmvgrvvlqtuj"');
    expect(config).not.toContain('project_id = "xytxkidpourwdbzzwcdp"');
  });
});
