import { useTranslation } from 'react-i18next';
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { GuestSongRequestsView } from '@/components/Dashboard/DJMCQuestionnaire/GuestSongRequestsSection';
import type { GuestSongRequestRow, SongRequestStatus } from '@/hooks/useGuestSongRequests';
import type { GuestSongRequestSettings } from '@/hooks/useGuestSongRequestSettings';
import { createCoalescedRead } from '@/lib/coalescedRead';
import { getCacheGeneration } from '@/lib/cacheRegistry';

export function DJMCSharedGuestRequests({ token, eventId, eventName, eventDate, canEdit, onRunUndoable }: {
  token: string; eventId: string; eventName: string; eventDate: string | null; canEdit: boolean;
  onRunUndoable?: (action: () => unknown | Promise<unknown>, rows: GuestSongRequestRow[]) => Promise<unknown>;
}) {
  const { i18n } = useTranslation();
  const [rows, setRows] = useState<GuestSongRequestRow[]>([]);
  const [settings, setSettings] = useState<GuestSongRequestSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const generation = useRef(0);
  const read = useRef(createCoalescedRead<any>());
  const refresh = useCallback(async (invalidate: unknown = false) => {
    const version = ++generation.current;
    const { data, error } = await read.current(`${getCacheGeneration()}:${token}`, () => (supabase.rpc as any)('get_dj_mc_guest_requests_by_token', { share_token: token }), invalidate === true);
    if (version !== generation.current) return;
    setLoading(false);
    setFailed(!!error || !data);
    if (!error && data) { setRows(data.rows || []); setSettings(data.settings); }
  }, [token]);
  useEffect(() => {
    setRows([]); setSettings(null); setLoading(true); refresh();
    const timer = window.setInterval(() => { if (document.visibilityState !== 'hidden') void refresh(); }, 15000);
    window.addEventListener('focus', refresh);
    const channel = supabase.channel(`djmc-shared-requests:${eventId}`).on('postgres_changes', {
      event: '*', schema: 'public', table: 'guest_song_requests', filter: `event_id=eq.${eventId}`,
    }, () => { void refresh(true); }).subscribe();
    return () => { ++generation.current; clearInterval(timer); window.removeEventListener('focus', refresh); supabase.removeChannel(channel); };
  }, [eventId, refresh]);
  const mutate = async (id: string, status: SongRequestStatus | null) => {
    if (!canEdit) return;
    const { data, error } = await (supabase.rpc as any)('update_dj_mc_guest_request_by_token', {
      share_token: token, request_id: id, new_status: status, remove_request: status === null,
    });
    if (error || data !== true) { setFailed(true); throw error || new Error('Failed to save'); }
    await refresh(true);
  };
  return <>
    {failed && <button type="button" onClick={refresh} className="text-destructive underline">Retry</button>}
    <GuestSongRequestsView language={i18n.language || 'en'} eventName={eventName} eventDate={eventDate} rows={rows} settings={settings}
      loading={loading || failed} disabled={!canEdit || failed}
      onRunUndoable={onRunUndoable}
      updateStatus={(id, status) => mutate(id, status)} deleteRequest={id => mutate(id, null)} />
  </>;
}
