import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type ProfileRow = { id: string; first_name: string; last_name: null; email: string; profile_image_path: null };
const state = vi.hoisted(() => ({
  users: [] as string[],
  rows: [] as Array<{ promise: Promise<{ data: ProfileRow; error: null }>; resolve: (value: { data: ProfileRow; error: null }) => void }>,
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getUser: vi.fn(async () => ({ data: { user: { id: state.users.shift() } }, error: null })) },
    from: () => ({ select: () => ({ eq: () => ({ single: () => state.rows.shift()!.promise }) }) }),
    storage: { from: () => ({ createSignedUrl: vi.fn() }) },
  },
}));

import { clearAllCaches } from '@/lib/cacheRegistry';
import { useProfile } from './useProfile';

const deferredRow = () => {
  let resolve!: (value: { data: ProfileRow; error: null }) => void;
  const promise = new Promise<{ data: ProfileRow; error: null }>((done) => { resolve = done; });
  return { promise, resolve };
};
const row = (id: string): ProfileRow => ({ id, first_name: id, last_name: null, email: `${id}@example.com`, profile_image_path: null });

describe('useProfile account-bound cache', () => {
  beforeEach(() => { clearAllCaches(); state.users = []; state.rows = []; });

  it('deduplicates same-user consumers and rejects a late response after an account change', async () => {
    const firstRequest = deferredRow();
    state.users.push('user-1');
    state.rows.push(firstRequest);
    const first = renderHook(() => useProfile());
    const duplicate = renderHook(() => useProfile());
    await waitFor(() => expect(state.rows).toHaveLength(0));

    clearAllCaches();
    const secondRequest = deferredRow();
    state.users.push('user-2');
    state.rows.push(secondRequest);
    const second = renderHook(() => useProfile());
    await act(async () => { secondRequest.resolve({ data: row('user-2'), error: null }); await secondRequest.promise; });
    await waitFor(() => expect(second.result.current.profile?.id).toBe('user-2'));

    await act(async () => { firstRequest.resolve({ data: row('user-1'), error: null }); await firstRequest.promise; });
    expect(second.result.current.profile?.id).toBe('user-2');
    expect(first.result.current.profile?.id).toBe('user-2');
    expect(duplicate.result.current.profile?.id).toBe('user-2');
  });
});
