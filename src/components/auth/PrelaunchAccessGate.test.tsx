import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { PrelaunchAccessGate } from './PrelaunchAccessGate';

const ownerSession = { user: { id: 'owner-uuid' } };
const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  getSession: vi.fn(),
  authCallback: undefined as undefined | ((event: string, session: { user: { id: string } } | null) => void),
  unsubscribe: vi.fn(),
}));
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

const open = () => render(<MemoryRouter initialEntries={['/dashboard']}><PrelaunchAccessGate><p>Protected owner tools</p></PrelaunchAccessGate></MemoryRouter>);

describe('prelaunch route gate', () => {
  it('waits for a slow valid gateway response without falsely failing or opening access early', async () => {
    vi.useFakeTimers();
    let finish!: (value: unknown) => void;
    mocks.rpc.mockReturnValue(new Promise(resolve => { finish = resolve; }));
    try {
      open();
      await act(async () => { await vi.advanceTimersByTimeAsync(24_500); });
      expect(screen.queryByText('Access verification is temporarily unavailable')).not.toBeInTheDocument();
      expect(screen.queryByText('Protected owner tools')).not.toBeInTheDocument();
      expect(mocks.rpc).toHaveBeenCalledOnce();
      await act(async () => finish({ data: { allowed: true }, error: null }));
      expect(screen.getByText('Protected owner tools')).toBeInTheDocument();
    } finally { cleanup(); vi.useRealTimers(); }
  });
  it('aborts timed-out access requests and stays blocked until verification succeeds', async () => {
    vi.useFakeTimers();
    let signal: AbortSignal | undefined;
    const pending = new Promise(() => undefined);
    mocks.rpc.mockReturnValue(Object.assign(pending, { abortSignal: (value: AbortSignal) => { signal = value; return pending; } }));
    try {
      open();
      await act(async () => { await vi.advanceTimersByTimeAsync(0); });
      await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
      expect(signal?.aborted).toBe(true);
      expect(screen.getByText('Access verification is temporarily unavailable')).toBeInTheDocument();
      expect(screen.queryByText('Protected owner tools')).not.toBeInTheDocument();
    } finally { cleanup(); vi.useRealTimers(); }
  });
  it('defers access requests until the auth callback has returned', async () => {
    mocks.getSession.mockReturnValue(new Promise(() => undefined));
    mocks.rpc.mockResolvedValue({ data: { allowed: true }, error: null });
    open();
    act(() => {
      mocks.authCallback?.('INITIAL_SESSION', ownerSession);
      expect(mocks.rpc).not.toHaveBeenCalled();
    });
    expect(await screen.findByText('Protected owner tools')).toBeInTheDocument();
  });

  it('does not queue a duplicate access request for the same user while checking', async () => {
    let resolveCheck!: (value: unknown) => void;
    mocks.rpc.mockReturnValue(new Promise(resolve => { resolveCheck = resolve; }));
    open();
    await waitFor(() => expect(mocks.rpc).toHaveBeenCalledOnce());
    act(() => mocks.authCallback?.('INITIAL_SESSION', ownerSession));
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 10)); });
    await act(async () => resolveCheck({ data: { allowed: true }, error: null }));
    expect(await screen.findByText('Protected owner tools')).toBeInTheDocument();
    expect(mocks.rpc).toHaveBeenCalledOnce();
  });

  it('recovers from a temporary first-request failure only after a successful retry', async () => {
    mocks.rpc.mockResolvedValueOnce({ data: null, error: new Error('Temporary network failure') })
      .mockResolvedValueOnce({ data: { allowed: true }, error: null });
    open();
    expect(await screen.findByText('Access verification is temporarily unavailable')).toBeInTheDocument();
    expect(screen.queryByText('Protected owner tools')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(screen.getByText('Loading Dashboard...')).toBeInTheDocument();
    expect(await screen.findByText('Protected owner tools')).toBeInTheDocument();
  });

  it('does not carry approved access across sign-out and a different sign-in', async () => {
    mocks.rpc.mockResolvedValueOnce({ data: { allowed: true }, error: null })
      .mockResolvedValueOnce({ data: { allowed: false }, error: null });
    open();
    await screen.findByText('Protected owner tools');
    act(() => mocks.authCallback?.('SIGNED_OUT', null));
    act(() => mocks.authCallback?.('SIGNED_IN', { user: { id: 'another-user' } }));
    expect(screen.queryByText('Protected owner tools')).not.toBeInTheDocument();
    expect(await screen.findByText('Wedding Waitress is launching soon')).toBeInTheDocument();
  });
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authCallback = undefined;
    mocks.getSession.mockResolvedValue({ data: { session: ownerSession }, error: null });
  });
  afterEach(() => cleanup());

  it('uses the dashboard loader only while the first authenticated access check resolves', () => {
    mocks.rpc.mockReturnValue(new Promise(() => undefined));
    open();
    expect(screen.getByText('Loading Dashboard...')).toBeInTheDocument();
    expect(screen.queryByText('Protected owner tools')).not.toBeInTheDocument();
  });

  it('allows the server-verified Platform Owner UUID entitlement', async () => {
    mocks.rpc.mockResolvedValue({ data: { enabled: true, allowed: true }, error: null });
    open();
    expect(await screen.findByText('Protected owner tools')).toBeInTheDocument();
  });

  it('blocks an ordinary account only after the server authoritatively denies it', async () => {
    mocks.rpc.mockResolvedValue({ data: { enabled: true, allowed: false }, error: null });
    open();
    expect(await screen.findByText('Wedding Waitress is launching soon')).toBeInTheDocument();
    expect(screen.queryByText('Protected owner tools')).not.toBeInTheDocument();
  });

  it('keeps verified content mounted through a token refresh and transient RPC failure', async () => {
    mocks.rpc
      .mockResolvedValueOnce({ data: { enabled: true, allowed: true }, error: null })
      .mockRejectedValueOnce(new Error('temporary outage'));
    open();
    expect(await screen.findByText('Protected owner tools')).toBeInTheDocument();

    act(() => mocks.authCallback?.('TOKEN_REFRESHED', ownerSession));
    await waitFor(() => expect(mocks.rpc).toHaveBeenCalledTimes(2));
    expect(screen.getByText('Protected owner tools')).toBeInTheDocument();
    expect(screen.queryByText('Access verification is temporarily unavailable')).not.toBeInTheDocument();
    expect(screen.queryByText('Loading Dashboard...')).not.toBeInTheDocument();
  });

  it('keeps verified content mounted when a focused tab has a transient verification failure', async () => {
    mocks.rpc
      .mockResolvedValueOnce({ data: { enabled: true, allowed: true }, error: null })
      .mockRejectedValueOnce(new Error('temporary outage'));
    open();
    expect(await screen.findByText('Protected owner tools')).toBeInTheDocument();

    fireEvent.focus(window);
    await waitFor(() => expect(mocks.rpc).toHaveBeenCalledTimes(2));
    expect(screen.getByText('Protected owner tools')).toBeInTheDocument();
  });

  it('ignores an older response after an authenticated account change', async () => {
    let resolveOld: ((value: unknown) => void) | undefined;
    mocks.rpc
      .mockReturnValueOnce(new Promise((resolve) => { resolveOld = resolve; }))
      .mockResolvedValueOnce({ data: { enabled: true, allowed: false }, error: null });
    open();
    await waitFor(() => expect(mocks.rpc).toHaveBeenCalledTimes(1));

    act(() => mocks.authCallback?.('SIGNED_IN', { user: { id: 'ordinary-user' } }));
    await act(async () => { resolveOld?.({ data: { enabled: true, allowed: true }, error: null }); });

    expect(await screen.findByText('Wedding Waitress is launching soon')).toBeInTheDocument();
    expect(screen.queryByText('Protected owner tools')).not.toBeInTheDocument();
  });
});
