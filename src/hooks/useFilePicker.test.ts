import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useFilePicker } from './useFilePicker';

describe('file picker cancellation recovery', () => {
  let input: HTMLInputElement;
  beforeEach(() => {
    vi.useFakeTimers();
    input = document.createElement('input');
    input.type = 'file';
    vi.spyOn(input, 'click').mockImplementation(() => {});
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
  });
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

  it.each(['cancel', 'change'])('restores readiness on native %s and allows another selection', event => {
    const { result } = renderHook(() => useFilePicker());
    act(() => result.current.openPicker(input));
    expect(result.current.awaitingPicker).toBe(true);
    act(() => input.dispatchEvent(new Event(event)));
    expect(result.current.awaitingPicker).toBe(false);
    act(() => result.current.openPicker(input));
    act(() => input.dispatchEvent(new Event('change')));
    expect(result.current.awaitingPicker).toBe(false);
    expect(input.click).toHaveBeenCalledTimes(2);
  });

  it.each(['focus', 'pageshow', 'visibilitychange'])('recovers without change after %s', event => {
    const { result } = renderHook(() => useFilePicker());
    act(() => result.current.openPicker(input));
    act(() => {
      (event === 'visibilitychange' ? document : window).dispatchEvent(new Event(event));
      vi.advanceTimersByTime(250);
    });
    expect(result.current.awaitingPicker).toBe(false);
  });

  it('bounds waiting when mobile emits no picker lifecycle events and accepts a late selection', () => {
    const selected = new File(['photo'], 'existing.jpg');
    Object.defineProperty(input, 'files', { value: [selected], configurable: true });
    const changed = vi.fn(); input.addEventListener('change', changed);
    const { result } = renderHook(() => useFilePicker());
    act(() => result.current.openPicker(input));
    act(() => vi.advanceTimersByTime(2000));
    expect(result.current.awaitingPicker).toBe(false);
    expect(input.files?.[0]).toBe(selected);
    act(() => input.dispatchEvent(new Event('change')));
    expect(changed).toHaveBeenCalledOnce();
  });

  it('waits while hidden and restores readiness when returning', () => {
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    const { result } = renderHook(() => useFilePicker());
    act(() => result.current.openPicker(input));
    act(() => vi.advanceTimersByTime(2000));
    expect(result.current.awaitingPicker).toBe(true);
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    act(() => { document.dispatchEvent(new Event('visibilitychange')); vi.advanceTimersByTime(250); });
    expect(result.current.awaitingPicker).toBe(false);
  });

  it('recovers on the first interaction, isolates attempts, and cleans up on unmount', () => {
    const { result, unmount } = renderHook(() => useFilePicker());
    act(() => result.current.openPicker(input));
    act(() => window.dispatchEvent(new Event('focus')));
    act(() => result.current.openPicker(input));
    act(() => vi.advanceTimersByTime(250));
    expect(result.current.awaitingPicker).toBe(true);
    act(() => window.dispatchEvent(new Event('pointerdown')));
    expect(result.current.awaitingPicker).toBe(false);
    act(() => result.current.openPicker(input));
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
