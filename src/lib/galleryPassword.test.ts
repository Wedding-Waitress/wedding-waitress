// Tests for the gallery password save/verify contract (RPC boundary).
import { describe, it, expect, vi, beforeEach } from 'vitest';

const rpc = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc: (...a: any[]) => rpc(...a) },
}));

import { supabase } from '@/integrations/supabase/client';

const savePassword = async (eventId: string, enabled: boolean, password: string | null) => {
  const { error } = await (supabase as any).rpc('set_event_media_password', {
    _event_id: eventId,
    _enabled: enabled,
    _password: password,
  });
  if (error) throw new Error(error.message);
  return true;
};

// Direct RPC verification is now revoked for anon/authenticated; the browser
// must go through the rate-limited edge function instead.
const verifyPasswordDirect = async (token: string, password: string) => {
  const { data, error } = await (supabase as any).rpc('verify_event_media_password', {
    _token: token,
    _password: password,
  });
  if (error) throw new Error(error.message);
  return data === true;
};


describe('gallery password', () => {
  beforeEach(() => rpc.mockReset());

  it('sets a password for the first time', async () => {
    rpc.mockResolvedValue({ data: true, error: null });
    await expect(savePassword('e1', true, 'secret1')).resolves.toBe(true);
    expect(rpc).toHaveBeenCalledWith('set_event_media_password', {
      _event_id: 'e1', _enabled: true, _password: 'secret1',
    });
  });

  it('changes an existing password', async () => {
    rpc.mockResolvedValue({ data: true, error: null });
    await savePassword('e1', true, 'newpass');
    expect(rpc.mock.calls[0][1]._password).toBe('newpass');
  });

  it('keeps the existing hash when enabling without a new password', async () => {
    rpc.mockResolvedValue({ data: true, error: null });
    await savePassword('e1', true, null);
    expect(rpc.mock.calls[0][1]._password).toBeNull();
  });

  it('disables password protection', async () => {
    rpc.mockResolvedValue({ data: true, error: null });
    await savePassword('e1', false, null);
    expect(rpc.mock.calls[0][1]._enabled).toBe(false);
  });

  it('denies direct RPC verification for anonymous callers', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'permission denied for function verify_event_media_password' } });
    await expect(verifyPasswordDirect('tok', 'secret1')).rejects.toThrow(/permission denied/);
  });

  it('denies direct RPC verification for another authenticated user', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'permission denied for function verify_event_media_password' } });
    await expect(verifyPasswordDirect('tok', 'nope')).rejects.toThrow(/permission denied/);
  });

  it('propagates save failures so the UI can roll back', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'Unauthorized' } });
    await expect(savePassword('e1', true, 'secret1')).rejects.toThrow('Unauthorized');
  });

  it('never sends or receives a password hash', async () => {
    rpc.mockResolvedValue({ data: true, error: null });
    await savePassword('e1', true, 'secret1');
    const payloads = JSON.stringify(rpc.mock.calls);
    expect(payloads).not.toMatch(/hash/i);
    expect(rpc.mock.results.every(r => typeof (r.value as any) !== 'string')).toBe(true);
  });

});
