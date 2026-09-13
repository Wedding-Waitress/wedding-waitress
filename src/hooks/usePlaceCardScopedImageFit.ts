import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { parsePlaceCardFitRecord, type PlaceCardFitRecord, type PlaceCardFitSnapshot } from '@/lib/placeCardScopedImageFit';
const bounded = <T,>(operation: PromiseLike<T>): Promise<T> => new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('Fit synchronization timed out')), 10000);
  Promise.resolve(operation).then(value => { clearTimeout(timer); resolve(value); }, error => { clearTimeout(timer); reject(error); });
});
export function usePlaceCardScopedImageFit(actorId: string | null, ownerId: string, eventId: string) {
  const identity = actorId && ownerId && eventId ? JSON.stringify([actorId, ownerId, eventId]) : null;
  const current = useRef(identity); current.current = identity;
  const generation = useRef(0), busy = useRef(false);
  const pending = useRef<{ identity: string; serialized: string; requestId: string; revision: number } | null>(null);
  const [loaded, setLoaded] = useState<{ identity: string; record: PlaceCardFitRecord | null } | null>(null);
  const [error, setError] = useState<string | null>(null), [saving, setSaving] = useState(false), [reloadVersion, setReloadVersion] = useState(0);
  useEffect(() => {
    const version = ++generation.current; setLoaded(null); setError(null); setSaving(false); pending.current = null;
    if (!identity) return;
    void (async () => {
      try {
        const result = await bounded(supabase.rpc('get_place_card_image_fit' as never, { p_event_id: eventId } as never));
        const value: unknown = result.data, record = value === null ? null : parsePlaceCardFitRecord(value, ownerId, eventId);
        if (result.error || value !== null && !record) throw new Error('Unverified fit');
        if (current.current === identity && generation.current === version) setLoaded({ identity, record });
      } catch { if (current.current === identity && generation.current === version) setError('Saved crop could not be verified. Your visible place cards are unchanged.'); }
    })();
    return () => { generation.current++; };
  }, [identity, ownerId, eventId, reloadVersion]);
  const verified = !!identity && loaded?.identity === identity, record = verified ? loaded.record : null;
  const save = useCallback(async (snapshot: PlaceCardFitSnapshot) => {
    if (!identity || !verified || busy.current) return false;
    const serialized = JSON.stringify(snapshot);
    if (pending.current && (pending.current.identity !== identity || pending.current.serialized !== serialized)) { setError('A previous save has an unknown outcome. Retry that exact crop or reload first.'); return false; }
    const request = pending.current ?? { identity, serialized, requestId: crypto.randomUUID(), revision: record?.revision ?? 0 };
    pending.current = request; busy.current = true; setSaving(true); setError(null); const version = generation.current;
    try {
      const result = await bounded(supabase.rpc('save_place_card_image_fit' as never, { p_event_id: eventId, p_snapshot: snapshot, p_expected_revision: request.revision, p_request_id: request.requestId } as never));
      const saved = parsePlaceCardFitRecord(result.data, ownerId, eventId);
      if (result.error || !saved || saved.revision !== request.revision + 1 || Object.entries(snapshot).some(([key, value]) => saved.snapshot[key as keyof PlaceCardFitSnapshot] !== value)) throw new Error('Save unverified');
      if (current.current !== identity || generation.current !== version) return false;
      pending.current = null; setLoaded({ identity, record: saved }); return true;
    } catch { if (current.current === identity && generation.current === version) setError('Crop save not confirmed. Retry that same decision safely or reload to check the server.'); return false; }
    finally { busy.current = false; if (current.current === identity && generation.current === version) setSaving(false); }
  }, [identity, verified, record, ownerId, eventId]);
  return { record, verified, error, saving, save, reload: () => setReloadVersion(value => value + 1) };
}
