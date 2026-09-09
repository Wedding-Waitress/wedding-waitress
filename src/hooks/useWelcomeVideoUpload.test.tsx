import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ invoke: vi.fn(), toast: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { functions: { invoke: mocks.invoke } } }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('tus-js-client', () => ({ Upload: vi.fn() }));
import { useWelcomeVideoUpload } from './useWelcomeVideoUpload';
beforeEach(() => vi.clearAllMocks());
describe('welcome video removal feedback', () => {
  it('refreshes and confirms only after the server confirms cleanup', async () => {
    mocks.invoke.mockResolvedValue({ data: { success: true }, error: null }); const refresh = vi.fn();
    const { result } = renderHook(() => useWelcomeVideoUpload('event', refresh));
    await act(async () => { await result.current.deleteVideo(); });
    expect(mocks.invoke).toHaveBeenCalledWith('delete-welcome-video', { body: { event_id: 'event' } });
    expect(refresh).toHaveBeenCalledOnce(); expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Video removed' }));
  });
  it.each([
    { data: null, error: new Error('Offline') },
    { data: { error: 'Cloudflare cleanup failed' }, error: null },
    { data: {}, error: null },
  ])('does not claim success on an unconfirmed removal', async response => {
    mocks.invoke.mockResolvedValue(response); const refresh = vi.fn();
    const { result } = renderHook(() => useWelcomeVideoUpload('event', refresh));
    await act(async () => { await result.current.deleteVideo(); });
    expect(refresh).not.toHaveBeenCalled();
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Delete failed', variant: 'destructive' }));
    expect(mocks.toast).not.toHaveBeenCalledWith(expect.objectContaining({ title: 'Video removed' }));
  });
});
