import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync('supabase/functions/qr-redirect/index.ts','utf8');

describe('QR redirect environment isolation', () => {
  it('keeps staging QR scans on the QA preview', () => {
    expect(source).toContain('supabaseUrl.includes("ufmpxsgncmvgrvvlqtuj")');
    expect(source).toContain('https://browserqa-aug30--weddingwaitress.netlify.app');
  });

  it('retains the production fallback outside staging', () => {
    expect(source).toContain('https://weddingwaitress.com.au');
    expect(source).toContain('Deno.env.get("PUBLIC_BASE_URL")');
  });
});
