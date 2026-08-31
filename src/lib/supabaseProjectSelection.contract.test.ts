import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Supabase project selection', () => {
  it('targets the active Wedding Waitress production project', () => {
    const config = readFileSync('supabase/config.toml', 'utf8');

    expect(config).toContain('project_id = "xytxkidpourwdbzzwcdp"');
  });
});
