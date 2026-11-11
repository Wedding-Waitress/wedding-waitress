import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  session: { user: { id: 'owner-user' } } as { user: { id: string } } | null,
  rpcResult: { data: true, error: null } as { data: boolean | null; error: unknown },
  authCallback: null as null | ((event: string, session: unknown) => void),
  unsubscribe: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(async () => ({ data: { session: mocks.session }, error: null })),
      onAuthStateChange: vi.fn((callback: (event: string, session: unknown) => void) => {
        mocks.authCallback = callback;
        return { data: { subscription: { unsubscribe: mocks.unsubscribe } } };
      }),
    },
    rpc: mocks.rpc,
  },
}));

import { useIsAdmin } from './useIsAdmin';

describe('useIsAdmin owner authorization', () => {
  beforeEach(() => {
    mocks.session = { user: { id: 'owner-user' } };
    mocks.rpcResult = { data: true, error: null };
    mocks.authCallback = null;
    mocks.unsubscribe.mockReset();
    mocks.rpc.mockReset();
    mocks.rpc.mockImplementation(async () => mocks.rpcResult);
  });

  it('uses the canonical backend owner/admin RPC for an authenticated session', async () => {
    const { result, unmount } = renderHook(() => useIsAdmin());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isAdmin).toBe(true);
    expect(mocks.rpc).toHaveBeenCalledWith('is_owner_admin');

    unmount();
    expect(mocks.unsubscribe).toHaveBeenCalledOnce();
  });
  it('does not duplicate bootstrap and INITIAL_SESSION checks', async () => {
    const { result } = renderHook(() => useIsAdmin());
    act(() => mocks.authCallback?.('INITIAL_SESSION', mocks.session));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mocks.rpc).toHaveBeenCalledOnce();
  });

  it('shares only an in-flight check between consumers of the same session', async () => {
    let finish!: (value: unknown) => void;
    mocks.rpc.mockReturnValue(new Promise(resolve => { finish = resolve; }));
    const one = renderHook(() => useIsAdmin());
    const two = renderHook(() => useIsAdmin());
    await waitFor(() => expect(mocks.rpc).toHaveBeenCalledOnce());
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 10)); });
    expect(mocks.rpc).toHaveBeenCalledOnce();
    await act(async () => finish({ data: true, error: null }));
    expect(one.result.current.isAdmin).toBe(true);
    expect(two.result.current.isAdmin).toBe(true);
  });

  it('does not grant admin when the backend rejects the current user', async () => {
    mocks.rpcResult = { data: false, error: null };
    const { result } = renderHook(() => useIsAdmin());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isAdmin).toBe(false);
  });

  it('clears admin immediately on sign-out without querying as an anonymous user', async () => {
    const { result } = renderHook(() => useIsAdmin());
    await waitFor(() => expect(result.current.isAdmin).toBe(true));
    const callsBeforeSignOut = mocks.rpc.mock.calls.length;

    act(() => mocks.authCallback?.('SIGNED_OUT', null));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isAdmin).toBe(false);
    expect(mocks.rpc).toHaveBeenCalledTimes(callsBeforeSignOut);
  });
});
