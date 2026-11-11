type ReadEntry<T> = { current: Promise<T>; next?: Promise<T> };

/** Pending reads only: no cached results or permission decisions. Invalidation
 * during a read schedules one fresh read after it, rather than another burst. */
export function createCoalescedRead<T>() {
  const pending = new Map<string, ReadEntry<T>>();
  const read = (key: string, task: () => PromiseLike<T>, invalidate = false): Promise<T> => {
    const existing = pending.get(key);
    if (existing) {
      if (!invalidate) return existing.next || existing.current;
      if (!existing.next) {
        existing.next = existing.current.catch(() => undefined).then(() => read(key, task));
      }
      return existing.next;
    }
    const entry: ReadEntry<T> = { current: Promise.resolve().then(task) };
    pending.set(key, entry);
    const clear = () => { if (pending.get(key) === entry) pending.delete(key); };
    entry.current.then(clear, clear);
    return entry.current;
  };
  return read;
}
