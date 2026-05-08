/**
 * Cache Registry
 *
 * Module-level caches across hooks register a clear() callback here so they
 * can all be wiped on auth changes (sign-out / account switch). Prevents
 * one user briefly seeing another user's cached data on the same device.
 */

const clearers = new Set<() => void>();

export function registerCache(clear: () => void): void {
  clearers.add(clear);
}

export function clearAllCaches(): void {
  clearers.forEach((c) => {
    try {
      c();
    } catch {
      /* ignore individual cache failures */
    }
  });
}

// Listen for global auth-clear event (dispatched from useEvents on SIGNED_OUT).
if (typeof window !== 'undefined') {
  window.addEventListener('ww:auth-cleared', () => clearAllCaches());
}
