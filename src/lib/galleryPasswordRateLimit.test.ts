// Tests for the rate-limited public gallery password verification path.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const invoke = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: (...a: any[]) => invoke(...a) }, rpc: vi.fn() },
}));

import { verifyGalleryPassword, blockedMessage } from '@/lib/verifyGalleryPassword';
import { getGalleryDeviceId } from '@/lib/galleryDeviceId';

const rateLimited = (secs: number) => ({
  data: null,
  error: { message: 'Edge Function returned a non-2xx status code', context: { json: async () => ({ ok: false, rateLimited: true, retryAfterSeconds: secs }) } },
});

describe('gallery password rate limiting (client contract)', () => {
  beforeEach(() => {
    invoke.mockReset();
    localStorage.clear();
  });

  it('sends token, password and an opaque device id — never an IP', async () => {
    invoke.mockResolvedValue({ data: { ok: true }, error: null });
    await verifyGalleryPassword('tok', 'secret1');
    const body = invoke.mock.calls[0][1].body;
    expect(body.token).toBe('tok');
    expect(body.deviceId).toEqual(expect.any(String));
    expect(JSON.stringify(body)).not.toMatch(/ip|forwarded/i);
  });

  it('never calls the verify RPC directly from the browser', async () => {
    invoke.mockResolvedValue({ data: { ok: true }, error: null });
    await verifyGalleryPassword('tok', 'secret1');
    const { supabase } = await import('@/integrations/supabase/client');
    expect((supabase as any).rpc).not.toHaveBeenCalled();
  });

  it('attempts 1 through 5 return a plain incorrect-password result', async () => {
    invoke.mockResolvedValue({ data: { ok: false }, error: null });
    for (let i = 1; i <= 5; i++) {
      const res = await verifyGalleryPassword('tok', 'wrong');
      expect(res).toMatchObject({ ok: false, rateLimited: false });
    }
  });

  it('blocks the next attempt with a 429 payload', async () => {
    invoke.mockResolvedValue(rateLimited(900));
    const res = await verifyGalleryPassword('tok', 'wrong');
    expect(res.rateLimited).toBe(true);
  });

  it('surfaces the server-provided retryAfterSeconds', async () => {
    invoke.mockResolvedValue(rateLimited(742));
    const res = await verifyGalleryPassword('tok', 'wrong');
    expect(res.retryAfterSeconds).toBe(742);
  });

  it('a correct password during an active block is still refused', async () => {
    invoke.mockResolvedValue(rateLimited(300));
    const res = await verifyGalleryPassword('tok', 'correct-password');
    expect(res.ok).toBe(false);
    expect(res.rateLimited).toBe(true);
  });

  it('successful verification returns ok', async () => {
    invoke.mockResolvedValue({ data: { ok: true }, error: null });
    await expect(verifyGalleryPassword('tok', 'right')).resolves.toMatchObject({ ok: true });
  });

  it('formats the blocked message in whole minutes', () => {
    expect(blockedMessage(900)).toBe('Too many incorrect attempts. Please try again in 15 minutes.');
    expect(blockedMessage(30)).toBe('Too many incorrect attempts. Please try again in 1 minute.');
    expect(blockedMessage(0)).toBe('Too many incorrect attempts. Please try again in 1 minute.');
  });

  it('reuses one stable device id across attempts', async () => {
    invoke.mockResolvedValue({ data: { ok: false }, error: null });
    await verifyGalleryPassword('tok', 'a');
    await verifyGalleryPassword('tok', 'b');
    expect(invoke.mock.calls[0][1].body.deviceId).toBe(invoke.mock.calls[1][1].body.deviceId);
  });

  it('different browsers produce different device ids (shared venue Wi-Fi)', () => {
    const a = getGalleryDeviceId();
    localStorage.clear();
    const b = getGalleryDeviceId();
    expect(a).not.toBe(b);
  });

  it('never persists the password, hash or token in local storage', async () => {
    invoke.mockResolvedValue({ data: { ok: false }, error: null });
    await verifyGalleryPassword('tok-abc', 'secret1');
    expect(JSON.stringify(localStorage)).not.toMatch(/secret1|tok-abc|hash/);
  });

  it('does not embed any service-role credential in client code', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync('src/lib/verifyGalleryPassword.ts', 'utf8')
      + readFileSync('src/lib/galleryDeviceId.ts', 'utf8')
      + readFileSync('src/components/Dashboard/PhotoVideoGallery/GalleryPasswordGate.tsx', 'utf8');
    expect(src).not.toMatch(/service_role|SERVICE_ROLE|MEDIA_PASSWORD_RL_PEPPER/);
  });


  it('concurrent submissions each hit the server (no client-only allowance)', async () => {
    invoke.mockResolvedValue({ data: { ok: false }, error: null });
    await Promise.all([verifyGalleryPassword('t', 'a'), verifyGalleryPassword('t', 'b')]);
    expect(invoke).toHaveBeenCalledTimes(2);
  });

  it('generic failures do not reveal whether the event or token exists', async () => {
    invoke.mockResolvedValue({ data: { ok: false }, error: null });
    const res = await verifyGalleryPassword('nonexistent-token', 'x');
    expect(res).toEqual({ ok: false, rateLimited: false, retryAfterSeconds: 0 });
  });
});
