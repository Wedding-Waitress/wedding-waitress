import { useEffect, useReducer, useRef } from 'react';
import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { getCacheGeneration, registerCache } from '@/lib/cacheRegistry';

interface Save<T> {
  patch: Partial<T>;
  write: (patch: Partial<T>, confirmed: T) => Promise<T>;
  failed: () => void;
  resolve: (saved: boolean) => void;
}
interface EventState<T> {
  confirmed?: T;
  revision: number;
  queue: Save<T>[];
  running: boolean;
  listeners: Set<() => void>;
}
let clients = new WeakMap<QueryClient, Map<string, EventState<any>>>();
registerCache(() => { clients = new WeakMap(); });
function stateFor<T>(client: QueryClient, key: string): EventState<T> {
  let states = clients.get(client);
  if (!states) { states = new Map(); clients.set(client, states); }
  let state = states.get(key);
  if (!state) { state = { revision: 0, queue: [], running: false, listeners: new Set() }; states.set(key, state); }
  return state;
}
const projected = <T,>(state: EventState<T>): T | undefined => state.confirmed
  ? state.queue.reduce((value, save) => ({ ...value, ...save.patch }), state.confirmed)
  : undefined;

// One ordered write queue per event and settings table, shared by hook consumers.
// Pending patches remain overlaid over confirmed responses, so an older success
// or failure cannot replace a newer click. Other events have independent queues.
export function useOptimisticEventSettings<T extends { event_id: string }>({
  namespace, eventId, read, write, onError,
}: {
  namespace: string;
  eventId: string | null | undefined;
  read: (eventId: string) => Promise<T>;
  write: (eventId: string, patch: Partial<T>, confirmed: T) => Promise<T>;
  onError: () => void;
}) {
  const client = useQueryClient();
  const generation = getCacheGeneration();
  const activeEvent = useRef(eventId);
  activeEvent.current = eventId;
  const queryKey = [namespace, eventId];
  const state = stateFor<T>(client, JSON.stringify(queryKey));
  const [, render] = useReducer(value => value + 1, 0);
  useEffect(() => { state.listeners.add(render); return () => { state.listeners.delete(render); }; }, [state]);
  const query = useQuery({
    queryKey,
    enabled: !!eventId,
    retry: false,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const revision = state.revision;
      const data = await read(eventId!);
      // A read begun before a click must not undo its write or optimistic UI.
      if (state.revision === revision && !state.queue.length) state.confirmed = data;
      return projected(state) ?? data;
    },
  });
  const settings = query.data?.event_id === eventId ? query.data : undefined;
  const publish = () => {
    if (getCacheGeneration() !== generation) return;
    client.setQueryData(queryKey, projected(state));
    state.listeners.forEach(listener => listener());
  };
  const update = (patch: Partial<T>): Promise<boolean> => {
    if (!eventId || !settings || getCacheGeneration() !== generation) return Promise.resolve(false);
    if (!state.confirmed) state.confirmed = settings;
    state.revision++;
    return new Promise(resolve => {
      state.queue.push({ patch, write: (changes, confirmed) => write(eventId, changes, confirmed), failed: () => { if (activeEvent.current === eventId) onError(); }, resolve });
      publish(); // Synchronous visual feedback; no request is awaited here.
      if (state.running) return;
      state.running = true;
      void (async () => {
        while (state.queue.length) {
          if (getCacheGeneration() !== generation) {
            state.queue.splice(0).forEach(save => save.resolve(false));
            break;
          }
          const save = state.queue[0];
          let saved = false;
          try { state.confirmed = await save.write(save.patch, state.confirmed!); saved = true; }
          catch { if (getCacheGeneration() === generation) save.failed(); }
          state.queue.shift();
          state.revision++;
          publish();
          save.resolve(saved);
        }
        state.running = false;
      })();
    });
  };
  return {
    settings,
    isLoading: !!eventId && !settings && !query.isError,
    isError: query.isError && !query.isFetching,
    isSaving: state.queue.length > 0,
    update,
    refresh: () => query.refetch(),
  };
}
