import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync('supabase/functions/qr-redirect/index.ts','utf8');

describe('QR redirect environment isolation', () => {
  it('uses the configured origin or the canonical production fallback', () => {
    expect(source).toContain('https://weddingwaitress.com.au');
    expect(source).toContain('Deno.env.get("PUBLIC_BASE_URL")');
    expect(source).toContain('const publicBaseUrl = configuredBaseUrl || "https://weddingwaitress.com.au"');
  });
});
