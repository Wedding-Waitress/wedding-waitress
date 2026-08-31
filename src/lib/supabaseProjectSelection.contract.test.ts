import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Supabase project selection', () => {
  it('targets the active Wedding Waitress production project', () => {
    const config = readFileSync('supabase/config.toml', 'utf8');

    expect(config).toContain('project_id = "xytxkidpourwdbzzwcdp"');
  });

  it('loads browser credentials only from the current Vite environment', () => {
    const client = readFileSync('src/integrations/supabase/client.ts', 'utf8');

    expect(client).toContain('import.meta.env.VITE_SUPABASE_URL');
    expect(client).toContain('import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY');
    expect(client).not.toMatch(/https:\/\/[a-z]{20}\.supabase\.co/);
  });

  it('refuses to silently move local development away from port 8080', () => {
    const viteConfig = readFileSync('vite.config.ts', 'utf8');

    expect(viteConfig).toContain('port: 8080');
    expect(viteConfig).toContain('strictPort: true');
  });
});
