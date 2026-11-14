import { describe, expect, it, vi } from 'vitest';
import { createCoalescedRead } from './coalescedRead';

describe('pending refresh coalescing', () => {
  it('combines focus/poll requests without caching a finished response', async () => {
    const read = createCoalescedRead<number>();
    let resolve!: (value: number) => void;
    const task = vi.fn(() => new Promise<number>(done => { resolve = done; }));
    const first = read('event', task), second = read('event', task);
    await Promise.resolve(); expect(task).toHaveBeenCalledOnce();
    resolve(1); expect(await first).toBe(1); expect(await second).toBe(1);
    const third = read('event', task); await Promise.resolve();
    expect(task).toHaveBeenCalledTimes(2); resolve(2); expect(await third).toBe(2);
  });
  it('serializes a burst of invalidations into one fresh follow-up', async () => {
    const read = createCoalescedRead<number>();
    let resolve!: (value: number) => void;
    const task = vi.fn(() => new Promise<number>(done => { resolve = done; }));
    const first = read('event', task); await Promise.resolve();
    const next = read('event', task, true), again = read('event', task, true);
    expect(task).toHaveBeenCalledOnce(); resolve(1); await first;
    await Promise.resolve(); await Promise.resolve();
    expect(task).toHaveBeenCalledTimes(2); resolve(2);
    expect(await next).toBe(2); expect(await again).toBe(2);
  });
  it('isolates scopes and recovers after failed reads', async () => {
    const read = createCoalescedRead<number>();
    await expect(read('old', () => Promise.reject(new Error('offline')))).rejects.toThrow('offline');
    expect(await read('old', () => Promise.resolve(1))).toBe(1);
    expect(await read('new', () => Promise.resolve(2))).toBe(2);
  });
});
