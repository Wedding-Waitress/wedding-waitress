import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';

const STORAGE_KEY = 'ww:selected_event_id';
const LEGACY_SESSION = 'ww:session_selected_event';
const LEGACY_LOCAL = 'active_event_id';

async function freshImport() {
  vi.resetModules();
  return import('./useSelectedEvent');
}

describe('useSelectedEvent', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('persists setSelectedEventId to localStorage under the unified key', async () => {
    const mod = await freshImport();
    act(() => {
      mod.setSelectedEventId('abc');
    });
    expect(localStorage.getItem(STORAGE_KEY)).toBe('abc');
    expect(mod.getSelectedEventId()).toBe('abc');
  });

  it('migrates legacy sessionStorage and localStorage keys on first import', async () => {
    sessionStorage.setItem(LEGACY_SESSION, 'legacy-session-id');
    const mod = await freshImport();
    expect(mod.getSelectedEventId()).toBe('legacy-session-id');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('legacy-session-id');
    expect(sessionStorage.getItem(LEGACY_SESSION)).toBeNull();

    // localStorage legacy key migration
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem(LEGACY_LOCAL, 'legacy-local-id');
    const mod2 = await freshImport();
    expect(mod2.getSelectedEventId()).toBe('legacy-local-id');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('legacy-local-id');
    expect(localStorage.getItem(LEGACY_LOCAL)).toBeNull();
  });

  it('auto-recovers when stored id is missing from events', async () => {
    localStorage.setItem(STORAGE_KEY, 'gone');
    const { useSelectedEvent } = await freshImport();
    const events = [{ id: 'b' }, { id: 'c' }];
    const { result } = renderHook(() => useSelectedEvent(events));
    // Effect runs after mount
    await act(async () => { await Promise.resolve(); });
    expect(result.current.selectedEventId).toBe('b');
    expect(result.current.selectedEvent).toEqual({ id: 'b' });
  });

  it('resolves to null when events list is empty', async () => {
    localStorage.setItem(STORAGE_KEY, 'something');
    const { useSelectedEvent } = await freshImport();
    const { result } = renderHook(() => useSelectedEvent([]));
    await act(async () => { await Promise.resolve(); });
    expect(result.current.selectedEventId).toBeNull();
    expect(result.current.status).toBe('empty');
  });

  it('preserves the last selected event while the event list is loading or revalidating', async () => {
    localStorage.setItem(STORAGE_KEY, 'A');
    const { useSelectedEvent } = await freshImport();
    const { result, rerender } = renderHook(
      ({ events, loading }) => useSelectedEvent(events, { loading }),
      { initialProps: { events: [{ id: 'A', name: 'Jason & Linda' }], loading: false } },
    );

    expect(result.current.selectedEvent).toEqual({ id: 'A', name: 'Jason & Linda' });
    rerender({ events: [], loading: true });

    expect(result.current.selectedEventId).toBe('A');
    expect(result.current.selectedEvent).toEqual({ id: 'A', name: 'Jason & Linda' });
    expect(result.current.status).toBe('selected');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('A');
  });

  it('does not clear a stored selection during initial loading, then confirms a genuine empty state', async () => {
    localStorage.setItem(STORAGE_KEY, 'A');
    const { useSelectedEvent } = await freshImport();
    const { result, rerender } = renderHook(
      ({ loading }) => useSelectedEvent([], { loading }),
      { initialProps: { loading: true } },
    );

    expect(result.current.selectedEventId).toBe('A');
    expect(result.current.status).toBe('loading');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('A');

    rerender({ loading: false });
    await act(async () => { await Promise.resolve(); });
    expect(result.current.selectedEventId).toBeNull();
    expect(result.current.status).toBe('empty');
  });

  it('responds to ww:selected-event-set, ww:selected-event-cleared and ww:auth-cleared', async () => {
    const { useSelectedEvent } = await freshImport();
    const { result } = renderHook(() => useSelectedEvent());

    act(() => {
      window.dispatchEvent(new CustomEvent('ww:selected-event-set', { detail: 'x' }));
    });
    expect(result.current.selectedEventId).toBe('x');

    act(() => {
      window.dispatchEvent(new Event('ww:selected-event-cleared'));
    });
    expect(result.current.selectedEventId).toBeNull();

    act(() => {
      window.dispatchEvent(new CustomEvent('ww:selected-event-set', { detail: 'y' }));
    });
    expect(result.current.selectedEventId).toBe('y');

    act(() => {
      window.dispatchEvent(new Event('ww:auth-cleared'));
    });
    expect(result.current.selectedEventId).toBeNull();
  });

  it('updates on cross-tab StorageEvent for the unified key', async () => {
    const { useSelectedEvent } = await freshImport();
    const { result } = renderHook(() => useSelectedEvent());

    act(() => {
      const evt = new StorageEvent('storage', {
        key: STORAGE_KEY,
        oldValue: null,
        newValue: 'tab-2-id',
      });
      window.dispatchEvent(evt);
    });
    expect(result.current.selectedEventId).toBe('tab-2-id');
  });

  it('multi-tab deletion: re-rendering with the deleted event removed falls back to first remaining', async () => {
    localStorage.setItem(STORAGE_KEY, 'A');
    const { useSelectedEvent } = await freshImport();
    const { result, rerender } = renderHook(
      ({ events }) => useSelectedEvent(events),
      { initialProps: { events: [{ id: 'A' }, { id: 'B' }] } },
    );
    await act(async () => { await Promise.resolve(); });
    expect(result.current.selectedEventId).toBe('A');

    rerender({ events: [{ id: 'B' }] });
    await act(async () => { await Promise.resolve(); });
    expect(result.current.selectedEventId).toBe('B');
  });
});
