import { act, renderHook, waitFor } from '@testing-library/react';
import type { Session } from '@supabase/supabase-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  location: { pathname: '/dashboard', search: '', hash: '' },
  getSession: vi.fn(),
  authCallback: undefined as ((event: string, session: Session | null) => void) | undefined,
  unsubscribe: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mocks.navigate, useLocation: () => mocks.location };
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
import { AuthenticatedSessionProvider } from '@/contexts/AuthenticatedSessionContext';
import { clearAllCaches } from '@/lib/cacheRegistry';

const session = { access_token: 'test-token', user: { id: 'user-1' } } as Session;

describe('useDashboardSession', () => {
  const wrapper = ({ children }: React.PropsWithChildren) => (
    <AuthenticatedSessionProvider>{children}</AuthenticatedSessionProvider>
  );
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authCallback = undefined;
    mocks.location.pathname = '/dashboard';
    mocks.location.search = '';
    mocks.location.hash = '';
    clearAllCaches();
    mocks.rpc.mockResolvedValue({ data: { status: 'active' }, error: null });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('blocks normal application access for an account awaiting deletion', async () => {
    mocks.getSession.mockResolvedValue({ data: { session }, error: null });
    mocks.rpc.mockResolvedValue({ data: { status: 'scheduled_for_deletion' }, error: null });
    renderHook(() => useDashboardSession(), { wrapper });
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith('/account-recovery', { replace: true }));
  });

  it('clears loading from INITIAL_SESSION when getSession remains pending', async () => {
    mocks.getSession.mockReturnValue(new Promise(() => undefined));
    const { result } = renderHook(() => useDashboardSession(), { wrapper });

    expect(result.current.loading).toBe(true);
    act(() => mocks.authCallback?.('INITIAL_SESSION', session));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.session).toBe(session);
    expect(result.current.error).toBeNull();
  });

  it('turns a fully stalled session bootstrap into a recoverable error', async () => {
    vi.useFakeTimers();
    mocks.getSession.mockReturnValue(new Promise(() => undefined));
    const { result } = renderHook(() => useDashboardSession(), { wrapper });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(
      'Session restoration took too long. Please check your connection and try again.',
    );
  });

  it('recovers if INITIAL_SESSION arrives after the timeout failure state', async () => {
    vi.useFakeTimers();
    mocks.getSession.mockReturnValue(new Promise(() => undefined));
    const { result } = renderHook(() => useDashboardSession(), { wrapper });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(result.current.error).not.toBeNull();

    await act(async () => {
      mocks.authCallback?.('INITIAL_SESSION', session);
      await Promise.resolve();
    });

    expect(result.current.session).toBe(session);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('redirects cleanly if a late INITIAL_SESSION confirms the visitor is signed out', async () => {
    vi.useFakeTimers();
    mocks.getSession.mockReturnValue(new Promise(() => undefined));
    const { result } = renderHook(() => useDashboardSession(), { wrapper });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(result.current.error).not.toBeNull();

    act(() => mocks.authCallback?.('INITIAL_SESSION', null));

    expect(result.current.loading).toBe(false);
    expect(result.current.session).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('turns a stalled account lifecycle check into a recoverable error', async () => {
    vi.useFakeTimers();
    mocks.getSession.mockResolvedValue({ data: { session }, error: null });
    mocks.rpc.mockReturnValue(new Promise(() => undefined));
    const { result } = renderHook(() => useDashboardSession(), { wrapper });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(result.current.loading).toBe(true);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(
      'Account verification took too long. Please check your connection and try again.',
    );
  });

  it('keeps a lifecycle failure visible when the same auth session is emitted again', async () => {
    vi.useFakeTimers();
    mocks.getSession.mockResolvedValue({ data: { session }, error: null });
    mocks.rpc.mockReturnValue(new Promise(() => undefined));
    const { result } = renderHook(() => useDashboardSession(), { wrapper });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(result.current.loading).toBe(true);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(result.current.error).toBe(
      'Account verification took too long. Please check your connection and try again.',
    );

    act(() => mocks.authCallback?.('TOKEN_REFRESHED', session));

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(
      'Account verification took too long. Please check your connection and try again.',
    );
  });

  it('exposes a recoverable error and retries without bypassing auth', async () => {
    mocks.getSession
      .mockRejectedValueOnce(new Error('Session storage unavailable'))
      .mockResolvedValueOnce({ data: { session }, error: null });
    const { result } = renderHook(() => useDashboardSession(), { wrapper });

    await waitFor(() => expect(result.current.error).toBe('Session storage unavailable'));
    expect(result.current.loading).toBe(false);

    act(() => result.current.retry());
    await waitFor(() => expect(result.current.session).toBe(session));
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(mocks.getSession).toHaveBeenCalledTimes(2);
  });

  it('redirects an unauthorised protected-route visitor without exposing content', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: null }, error: null });
    const { result } = renderHook(() => useDashboardSession(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.session).toBeNull();
    expect(mocks.navigate).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('redirects a genuinely invalid stored refresh session without signing out', async () => {
    mocks.getSession.mockResolvedValue({
      data: { session: null },
      error: { code: 'refresh_token_not_found', message: 'Invalid Refresh Token' },
    });
    const { result } = renderHook(() => useDashboardSession(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.session).toBeNull();
    expect(result.current.error).toBeNull();
    expect(mocks.navigate).not.toHaveBeenCalled();
  });

  it('cleans up its authentication listener when the protected scope unmounts', () => {
    mocks.getSession.mockReturnValue(new Promise(() => undefined));
    const { unmount } = renderHook(() => useDashboardSession(), { wrapper });
    unmount();
    expect(mocks.unsubscribe).toHaveBeenCalledTimes(1);
  });
});
