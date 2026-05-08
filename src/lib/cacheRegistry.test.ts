import { describe, it, expect, beforeEach, vi } from 'vitest';

async function freshImport() {
  vi.resetModules();
  return import('./cacheRegistry');
}

describe('cacheRegistry', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('runs every registered clearer when ww:auth-cleared is dispatched', async () => {
    const { registerCache } = await freshImport();
    const a = vi.fn();
    const b = vi.fn();
    registerCache(a);
    registerCache(b);

    window.dispatchEvent(new Event('ww:auth-cleared'));

    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });

  it('a throwing clearer does not stop subsequent clearers', async () => {
    const { registerCache } = await freshImport();
    const ran: string[] = [];
    registerCache(() => { ran.push('one'); throw new Error('boom'); });
    registerCache(() => { ran.push('two'); });

    expect(() => window.dispatchEvent(new Event('ww:auth-cleared'))).not.toThrow();
    expect(ran).toEqual(['one', 'two']);
  });

  it('clearAllCaches() runs clearers directly', async () => {
    const { registerCache, clearAllCaches } = await freshImport();
    const c = vi.fn();
    registerCache(c);
    clearAllCaches();
    expect(c).toHaveBeenCalledTimes(1);
  });
});
