/**
 * Cache Registry
 *
 * Module-level caches across hooks register a clear() callback here so they
 * can all be wiped on auth changes (sign-out / account switch). Prevents
 * one user briefly seeing another user's cached data on the same device.
 */

const clearers = new Set<() => void>();
const eventClearers = new Set<(eventId: string) => void>();
let cacheGeneration = 0;

export function registerCache(clear: () => void): void {
  clearers.add(clear);
}

export function registerEventCache(clear: (eventId: string) => void): void {
  eventClearers.add(clear);
}

export function clearEventCaches(eventId: string): void {
  eventClearers.forEach((clear) => {
    try {
      clear(eventId);
    } catch {
      /* ignore individual cache failures */
    }
  });
}

export function clearAllCaches(): void {
  cacheGeneration += 1;
  clearers.forEach((c) => {
    try {
      c();
    } catch {
      /* ignore individual cache failures */
    }
  });
}

export function getCacheGeneration(): number {
  return cacheGeneration;
}

// Listen for global auth-clear event (dispatched from useEvents on SIGNED_OUT).
if (typeof window !== 'undefined') {
  window.addEventListener('ww:auth-cleared', () => clearAllCaches());
}
