import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { describe, expect, it, vi } from 'vitest';
function fixture(overrides: Record<string, string | undefined> = {}) {
  const source = readFileSync('supabase/functions/purge-expired-access-accounts/index.ts', 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const env: Record<string, string | undefined> = { SUPABASE_URL: 'https://isolated.test',
    SUPABASE_SERVICE_ROLE_KEY: 'isolated-service', ACCESS_RECOVERY_CLEANUP_SECRET: 'isolated-processor', ...overrides };
  let handler!: (request: Request) => Promise<Response>;
  const fetch = vi.fn(() => { throw new Error('Disabled cleanup must never make network requests'); });
  new Function('Deno', 'fetch', compiled)({ env: { get: (name: string) => env[name] },
    serve: (callback: typeof handler) => { handler = callback; } }, fetch);
  return { handler, fetch };
}
const request = (method = 'POST', secret = 'isolated-processor') => new Request('https://isolated.test', {
  method, headers: { 'x-access-recovery-cleanup-secret': secret } });
describe('expiry never triggers account erasure', () => {
  it('returns an authenticated disabled result without network or storage side effects', async () => {
    const app = fixture();
    const response = await app.handler(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ disabled: true, processed: 0, completed: 0, failed: 0 });
    expect(app.fetch).not.toHaveBeenCalled();
  });
  it('keeps the processor-secret boundary even for a harmless disabled endpoint', async () => {
    const app = fixture();
    expect((await app.handler(request('POST', 'incorrect'))).status).toBe(401);
    expect((await app.handler(request('GET'))).status).toBe(405);
    expect(app.fetch).not.toHaveBeenCalled();
  });
  it.each(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'ACCESS_RECOVERY_CLEANUP_SECRET'])('fails closed for missing %s', async (name) => {
    const app = fixture({ [name]: undefined });
    expect((await app.handler(request())).status).toBe(500);
    expect(app.fetch).not.toHaveBeenCalled();
  });
});
