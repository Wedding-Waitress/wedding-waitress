// No tokens, URLs, user IDs, or permission grants are recorded here.
export const accessTimingNow = () => performance.now();
export function recordAccessTiming(stage: 'auth-bootstrap' | 'access-check', start: number, outcome: string) {
  try {
  const end = performance.now();
  let networkMs: number | null = null;
  let beforeNetworkMs: number | null = null;
  if (stage === 'access-check') {
    const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    const matches = entries.filter(entry => entry.name.includes('/rest/v1/rpc/get_prelaunch_access') && entry.startTime >= start);
    const request = matches[matches.length - 1];
    if (request) { networkMs = request.duration; beforeNetworkMs = Math.max(0, request.startTime - start); }
  }
  const detail = { stage, outcome, totalMs: end - start, networkMs, beforeNetworkMs };
  // Inspect this mark in DevTools Performance, or listen for the matching event.
  try { performance.measure(`ww:${stage}`, { start, end, detail }); } catch { /* timing support varies */ }
  window.dispatchEvent(new CustomEvent('ww:access-verification-timing', { detail }));
  } catch { /* Diagnostic failures must never change an access decision. */ }
}
