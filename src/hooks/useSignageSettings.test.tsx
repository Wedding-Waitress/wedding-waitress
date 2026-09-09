import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({ read: vi.fn(), save: vi.fn(), toast: vi.fn(), clear: [] as Array<() => void> }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: m.toast }) }));
vi.mock('@/lib/cacheRegistry', () => ({ registerCache: (f: () => void) => m.clear.push(f), registerEventCache: vi.fn() }));
vi.mock('@/lib/localWeddingFonts', () => ({ resolveWeddingFontZones: (zones: unknown) => zones }));
vi.mock('@/lib/imagePipeline', () => ({ previewUrlFor: (url: string) => url }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  auth: { getUser: async () => ({ data: { user: { id: 'owner' } } }) },
  from: () => ({
    select: () => ({ eq: (key: string, value: string) => ({ maybeSingle: () => m.read(value) }) }),
    update: (updates: unknown) => ({ eq: (_: string, id: string) => ({ eq: (_: string, event: string) => ({ select: () => ({ single: () => m.save(updates, id, event) }) }) }) }),
  }),
} }));
import { useSignageSettings } from './useSignageSettings';
const row = (event: string) => ({ id: `row-${event}`, event_id: event, user_id: 'owner', background_color: '#ffffff', text_zones: [], notes: '', qr_config: {} });
beforeEach(() => {
  m.clear.forEach(f => f()); vi.clearAllMocks();
  m.read.mockImplementation(async event => ({ data: row(event), error: null }));
  m.save.mockResolvedValue({ data: { id: 'saved' }, error: null });
});
afterEach(() => { vi.useRealTimers(); });
async function loaded() {
  const hook = renderHook(({ event }) => useSignageSettings(event), { initialProps: { event: 'one' } });
  await waitFor(() => expect(hook.result.current.settings?.id).toBe('row-one'));
  vi.useFakeTimers(); return hook;
}
it('saves both different fields edited within one debounce period', async () => {
  const { result } = await loaded(); let first!: Promise<boolean>, second!: Promise<boolean>;
  act(() => { first = result.current.updateSettings({ notes: 'print notes' }); second = result.current.updateSettings({ background_color: '#abcdef' }); });
  expect(result.current.settings).toMatchObject({ notes: 'print notes', background_color: '#abcdef' });
  await act(async () => { await vi.advanceTimersByTimeAsync(300); });
  expect(await first).toBe(true); expect(await second).toBe(true);
  expect(m.save).toHaveBeenCalledWith({ notes: 'print notes', background_color: '#abcdef' }, 'row-one', 'one');
});
it('flushes pending edits when the editor is unmounted', async () => {
  const { result, unmount } = await loaded();
  act(() => { void result.current.updateSettings({ notes: 'keep this' }); }); unmount();
  await act(async () => { await Promise.resolve(); });
  expect(m.save).toHaveBeenCalledWith({ notes: 'keep this' }, 'row-one', 'one');
});
it('reports rejection and retries the failed fields with the next change', async () => {
  const { result } = await loaded(); m.save.mockResolvedValueOnce({ error: new Error('rejected') });
  let saved!: Promise<boolean>; act(() => { saved = result.current.updateSettings({ notes: 'retain' }); });
  await act(async () => { await vi.advanceTimersByTimeAsync(300); }); expect(await saved).toBe(false);
  expect(m.toast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }));
  act(() => { void result.current.updateSettings({ background_color: '#123456' }); });
  await act(async () => { await vi.advanceTimersByTimeAsync(300); });
  expect(m.save).toHaveBeenLastCalledWith({ notes: 'retain', background_color: '#123456' }, 'row-one', 'one');
});
it('finishes an earlier write before sending the next one', async () => {
  const { result } = await loaded(); let release!: (r: unknown) => void;
  m.save.mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
  act(() => { void result.current.updateSettings({ notes: 'first' }); });
  await act(async () => { await vi.advanceTimersByTimeAsync(300); });
  act(() => { void result.current.updateSettings({ notes: 'second' }); });
  await act(async () => { await vi.advanceTimersByTimeAsync(300); }); expect(m.save).toHaveBeenCalledTimes(1);
  await act(async () => { release({ error: null }); await Promise.resolve(); });
  expect(m.save).toHaveBeenLastCalledWith({ notes: 'second' }, 'row-one', 'one');
});
