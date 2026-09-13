import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { IndividualChartSettings } from '@/components/Dashboard/IndividualTableChart/IndividualTableSeatingChartPage';
import { individualChartScopeKey, parseIndividualChartSavedSnapshot, snapshotIndividualChartSettings } from '@/lib/individualTableChartPersistence';
import type { IndividualChartSavedSnapshot } from '@/lib/individualTableChartPersistence';

const bounded = <T,>(operation: PromiseLike<T>): Promise<T> => new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('Chart synchronization timed out')), 10_000);
  Promise.resolve(operation).then(value => { clearTimeout(timer); resolve(value); }, error => { clearTimeout(timer); reject(error); });
});

/** Explicit saves only. Never reads the old unscoped session key or seeds an absent database row. */
export function useIndividualTableChartSettings(actorId: string | null, ownerId: string | null, eventId: string | null, enabled: boolean) {
  const scope = enabled && actorId && ownerId && eventId ? individualChartScopeKey(ownerId, eventId) : null;
  const identity = scope ? `${actorId}:${scope}` : null;
  const currentIdentity = useRef(identity);
  currentIdentity.current = identity;
  const generation = useRef(0);
  const pending = useRef<{ identity: string; requestId: string; serialized: string; expectedRevision: number } | null>(null);
  const busy = useRef(false);
  const [state, setState] = useState<{ identity: string; snapshot: IndividualChartSavedSnapshot | null } | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadVersion, setReloadVersion] = useState(0);
  const reload = useCallback(() => setReloadVersion(value => value + 1), []);

  useEffect(() => {
    const version = ++generation.current;
    setState(null); setError(null); setSaving(false); pending.current = null;
    if (!identity || !eventId || !ownerId) { setLoading(false); return; }
    setLoading(true);
    void (async () => {
      try {
        const { data, error: failure } = await bounded(supabase.rpc('get_individual_table_chart_settings' as never, { p_event_id: eventId } as never));
        const snapshot = data === null ? null : parseIndividualChartSavedSnapshot(data, ownerId, eventId);
        if (failure || (data !== null && !snapshot)) throw new Error('Chart settings could not be verified');
        if (generation.current !== version || currentIdentity.current !== identity) return;
        setState({ identity, snapshot });
      } catch {
        if (generation.current === version && currentIdentity.current === identity) setError('Could not verify saved chart settings. Your visible chart has not been changed.');
      } finally {
        if (generation.current === version && currentIdentity.current === identity) setLoading(false);
      }
    })();
    return () => { generation.current++; };
  }, [identity, eventId, ownerId, reloadVersion]);

  const verified = identity !== null && state?.identity === identity;
  const snapshot = verified ? state.snapshot : null;
  const save = useCallback(async (settings: IndividualChartSettings): Promise<boolean> => {
    const style = snapshotIndividualChartSettings(settings);
    if (!identity || !ownerId || !eventId || !verified || loading || busy.current || !style) return false;
    const serialized = JSON.stringify(style, Object.keys(style).sort());
    if (pending.current && (pending.current.identity !== identity || pending.current.serialized !== serialized)) {
      setError('A previous save has an unknown outcome. Retry that same save or reload before saving different settings.');
      return false;
    }
    const request = pending.current ?? { identity, requestId: crypto.randomUUID(), serialized, expectedRevision: snapshot?.revision ?? 0 };
    pending.current = request;
    busy.current = true; setSaving(true); setError(null);
    const version = generation.current;
    try {
      const { data, error: failure } = await bounded(supabase.rpc('save_individual_table_chart_settings' as never, {
        p_event_id: eventId, p_settings: style, p_expected_revision: request.expectedRevision, p_request_id: request.requestId,
      } as never));
      const saved = parseIndividualChartSavedSnapshot(data, ownerId, eventId);
      if (failure || !saved || saved.revision !== request.expectedRevision + 1
        || JSON.stringify(saved.settings, Object.keys(saved.settings).sort()) !== serialized) throw new Error('Save unverified');
      if (currentIdentity.current !== identity || generation.current !== version) return false;
      pending.current = null; setState({ identity, snapshot: saved });
      return true;
    } catch {
      if (currentIdentity.current === identity && generation.current === version) setError('Save not confirmed. Retry the same settings safely, or reload to check the server.');
      return false;
    } finally {
      busy.current = false;
      if (currentIdentity.current === identity && generation.current === version) setSaving(false);
    }
  }, [identity, ownerId, eventId, verified, loading, snapshot]);

  return { snapshot, verified, loading: Boolean(identity) && (loading || (!verified && !error)), saving, error, save, reload };
}
