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

import { useEffect, useState, useSyncExternalStore } from 'react';

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
  setSelectedEventId: (id: string | null) => void;
}

/**
 * Hook overload: pass `events` to get auto-recovery + a typed `selectedEvent`.
 */
export function useSelectedEvent<T extends { id: string }>(
  events?: T[],
): UseSelectedEventResult<T> {
  const id = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const [, force] = useState(0);

  // Auto-recover invalid IDs once events arrive.
  useEffect(() => {
    if (!events) return;
    if (events.length === 0) {
      if (id !== null) setSelectedEventId(null);
      return;
    }
    if (id && !events.find((e) => e.id === id)) {
      setSelectedEventId(events[0].id);
      force((n) => n + 1);
    }
  }, [events, id]);

  const selectedEvent =
    events && id ? events.find((e) => e.id === id) ?? null : null;

  return {
    selectedEventId: id,
    selectedEvent,
    setSelectedEventId,
  };
}
