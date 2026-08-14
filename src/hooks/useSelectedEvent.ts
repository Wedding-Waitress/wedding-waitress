/**
 * useSelectedEvent — single source of truth for the currently selected event.
 *
 * - Persists to localStorage key `ww:selected_event_id`.
 * - Migrates legacy keys (`ww:session_selected_event` in sessionStorage,
 *   `active_event_id` in localStorage) on first read.
 * - Auto-recovers when the stored ID is missing from `events` (falls back to
 *   the first event, or null if none).
 * - Subscribes to `ww:selected-event-set` and `ww:selected-event-cleared`
 *   window events for cross-component propagation.
 */

import { useEffect, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'ww:selected_event_id';
const LEGACY_SESSION_KEY = 'ww:session_selected_event';
const LEGACY_LOCAL_KEY = 'active_event_id';

const listeners = new Set<() => void>();

function readInitial(): string | null {
  if (typeof window === 'undefined') return null;
  let v = window.localStorage.getItem(STORAGE_KEY);
  if (!v) {
    // Migrate legacy keys
    const legacySession = window.sessionStorage.getItem(LEGACY_SESSION_KEY);
    const legacyLocal = window.localStorage.getItem(LEGACY_LOCAL_KEY);
    v = legacySession || legacyLocal;
    if (v) window.localStorage.setItem(STORAGE_KEY, v);
    if (legacySession) window.sessionStorage.removeItem(LEGACY_SESSION_KEY);
    if (legacyLocal) window.localStorage.removeItem(LEGACY_LOCAL_KEY);
  }
  return v;
}

let current: string | null = readInitial();
let lastSelectedEvent: { id: string } | null = null;

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

function getSnapshot() {
  return current;
}

export function setSelectedEventId(id: string | null): void {
  if (current === id) return;
  current = id;
  if (!id || lastSelectedEvent?.id !== id) lastSelectedEvent = null;
  if (typeof window !== 'undefined') {
    if (id) window.localStorage.setItem(STORAGE_KEY, id);
    else window.localStorage.removeItem(STORAGE_KEY);
  }
  emit();
}

export function getSelectedEventId(): string | null {
  return current;
}

if (typeof window !== 'undefined') {
  window.addEventListener('ww:selected-event-set', (e: Event) => {
    const id = (e as CustomEvent<string>).detail;
    if (typeof id === 'string') setSelectedEventId(id);
  });
  window.addEventListener('ww:selected-event-cleared', () => {
    setSelectedEventId(null);
  });
  window.addEventListener('ww:auth-cleared', () => {
    setSelectedEventId(null);
  });
  // Cross-tab sync
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) {
      const v = e.newValue || null;
      if (current !== v) {
        current = v;
        emit();
      }
    }
  });
}

export interface UseSelectedEventResult<T extends { id: string }> {
  selectedEventId: string | null;
  selectedEvent: T | null;
  status: 'loading' | 'empty' | 'selected';
  setSelectedEventId: (id: string | null) => void;
}

export interface UseSelectedEventOptions {
  /** True while the supplied event collection is being loaded or revalidated. */
  loading?: boolean;
}

/**
 * Hook overload: pass `events` to get auto-recovery + a typed `selectedEvent`.
 */
export function useSelectedEvent<T extends { id: string }>(
  events?: T[],
  options: UseSelectedEventOptions = {},
): UseSelectedEventResult<T> {
  const id = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const loading = options.loading ?? false;
  const matchingEvent = events && id ? events.find((event) => event.id === id) ?? null : null;
  const fallbackEvent = !loading && events?.length && !matchingEvent ? events[0] : null;
  const resolvedEvent = matchingEvent ?? fallbackEvent;

  if (resolvedEvent) lastSelectedEvent = resolvedEvent;

  // Auto-recover invalid IDs once events arrive.
  useEffect(() => {
    if (!events || loading) return;
    if (events.length === 0) {
      if (id !== null) setSelectedEventId(null);
      return;
    }
    if (!id || !events.find((e) => e.id === id)) {
      setSelectedEventId(events[0].id);
    }
  }, [events, id, loading]);

  const selectedEvent = (resolvedEvent
    ?? (loading && id && lastSelectedEvent?.id === id ? lastSelectedEvent : null)) as T | null;
  const selectedEventId = resolvedEvent?.id ?? id;
  const status: UseSelectedEventResult<T>['status'] = selectedEvent
    ? 'selected'
    : loading
      ? 'loading'
      : selectedEventId
        ? 'loading'
        : 'empty';

  return {
    selectedEventId,
    selectedEvent,
    status,
    setSelectedEventId,
  };
}
