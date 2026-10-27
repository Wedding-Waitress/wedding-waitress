import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('dashboard background loading', () => {
  beforeEach(() => { vi.resetModules(); vi.useFakeTimers(); });
  afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

  async function setup() {
    const module = await import('./dashboardPagePreload');
    const loaders = Object.keys(module.dashboardPageLoaders).map(key =>
      vi.spyOn(module.dashboardPageLoaders, key as keyof typeof module.dashboardPageLoaders)
        .mockResolvedValue({} as never));
    return { ...module, loaders };
  }

  it('waits for idle turns and never overlaps speculative feature loads', async () => {
    const m = await setup();
    let finish!: (value: never) => void;
    m.loaders[0].mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const work = m.preloadAllDashboardPages();
    expect(m.preloadAllDashboardPages()).toBe(work);
    expect(m.loaders.every(load => load.mock.calls.length === 0)).toBe(true);
    await vi.advanceTimersByTimeAsync(750);
    expect(m.loaders[0]).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(5000);
    expect(m.loaders[1]).not.toHaveBeenCalled();
    finish({} as never);
    await vi.advanceTimersByTimeAsync(0);
    expect(m.loaders[1]).not.toHaveBeenCalled();
    await vi.runAllTimersAsync();
    expect(await work).toHaveLength(15);
    m.loaders.forEach(load => expect(load).toHaveBeenCalledOnce());
  });

  it('loads an explicitly requested page immediately while background work waits', async () => {
    const m = await setup();
    const work = m.preloadAllDashboardPages();
    await m.preloadDashboardPage('running-sheet');
    expect(m.dashboardPageLoaders['running-sheet']).toHaveBeenCalledOnce();
    expect(m.loaders[0]).not.toHaveBeenCalled();
    expect(m.preloadDashboardPage('unknown')).toBeUndefined();
    await vi.runAllTimersAsync();
    await work;
  });

  it('continues after a failed speculative download and permits an intent retry', async () => {
    const m = await setup();
    m.loaders[0].mockRejectedValueOnce(new Error('offline'));
    const work = m.preloadAllDashboardPages();
    await vi.runAllTimersAsync();
    const results = await work;
    expect(results[0].status).toBe('rejected');
    expect(results.slice(1).every(result => result.status === 'fulfilled')).toBe(true);
    await m.preloadDashboardPage('my-events');
    expect(m.loaders[0]).toHaveBeenCalledTimes(2);
  });
});
