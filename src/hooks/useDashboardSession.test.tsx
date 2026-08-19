import { act, renderHook, waitFor } from '@testing-library/react';
import type { Session } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  getSession: vi.fn(),
  authCallback: undefined as ((event: string, session: Session | null) => void) | undefined,
  unsubscribe: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mocks.navigate };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: mocks.rpc,
    auth: {
      getSession: mocks.getSession,
      onAuthStateChange: (callback: typeof mocks.authCallback) => {
        mocks.authCallback = callback;
        return { data: { subscription: { unsubscribe: mocks.unsubscribe } } };
      },
    },
  },
}));

import { useDashboardSession } from './useDashboardSession';

const session = { access_token: 'test-token', user: { id: 'user-1' } } as Session;

describe('useDashboardSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authCallback = undefined;
    mocks.rpc.mockResolvedValue({ data: { status: 'active' }, error: null });
  });

  it('blocks normal application access for an account awaiting deletion', async () => {
    mocks.getSession.mockResolvedValue({ data: { session }, error: null });
    mocks.rpc.mockResolvedValue({ data: { status: 'scheduled_for_deletion' }, error: null });
    renderHook(() => useDashboardSession());
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith('/account-recovery', { replace: true }));
  });

  it('clears loading from INITIAL_SESSION when getSession remains pending', async () => {
    mocks.getSession.mockReturnValue(new Promise(() => undefined));
    const { result } = renderHook(() => useDashboardSession());

    expect(result.current.loading).toBe(true);
    act(() => mocks.authCallback?.('INITIAL_SESSION', session));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.session).toBe(session);
    expect(result.current.error).toBeNull();
  });

  it('exposes a recoverable error and retries without bypassing auth', async () => {
    mocks.getSession
      .mockRejectedValueOnce(new Error('Session storage unavailable'))
      .mockResolvedValueOnce({ data: { session }, error: null });
    const { result } = renderHook(() => useDashboardSession());

    await waitFor(() => expect(result.current.error).toBe('Session storage unavailable'));
    expect(result.current.loading).toBe(false);

    act(() => result.current.retry());
    await waitFor(() => expect(result.current.session).toBe(session));
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(mocks.getSession).toHaveBeenCalledTimes(2);
  });
});
