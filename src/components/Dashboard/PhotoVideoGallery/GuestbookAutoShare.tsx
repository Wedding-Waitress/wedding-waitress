import React, { useEffect, useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';

export function GuestbookAutoShare({ eventId }: { eventId: string | null }) {
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let cancelled = false;
    setEnabled(false); setReady(false); setError('');
    if (eventId) (supabase as any).rpc('get_guestbook_auto_share', { _event_id: eventId }).then(({ data, error }: any) => {
      if (cancelled) return;
      if (error) setError('Auto-share is unavailable until the update is deployed.');
      else { setEnabled(data === true); setReady(true); }
    }).catch(() => { if (!cancelled) setError('Could not load auto-share. Please refresh to retry.'); });
    return () => { cancelled = true; };
  }, [eventId]);
  const change = async (next: boolean) => {
    setSaving(true); setError('');
    try {
      const { error } = await (supabase as any).rpc('set_guestbook_auto_share', { _event_id: eventId, _enabled: next });
      if (error) throw error;
      setEnabled(next);
    } catch { setError('Could not save auto-share. Your previous setting is unchanged. Please try again.'); }
    finally { setSaving(false); }
  };
  return <div className="mt-4 flex flex-col gap-4 rounded-lg p-4 sm:flex-row sm:items-center sm:justify-between" data-guestbook-auto-share data-auto-share-enabled={enabled}>
    <div className="min-w-0 text-sm text-white">
      <p id="guestbook-auto-share-description">{enabled
        ? <>New written, audio and video Guestbook messages will be automatically shared to the guest gallery.<br />Existing messages keep their current sharing status. Turning this off only stops future automatic sharing.</>
        : <>New written, audio and video Guestbook messages remain private in this section.<br />Turn on auto-share to make new messages visible in the guest gallery. Existing messages keep their current sharing status.</>}</p>
      {error && <p role="alert" className="mt-2 text-white">{error}</p>}
    </div>
    <div className="flex shrink-0 items-center gap-3 text-white">
      <Label htmlFor="guestbook-auto-share">Auto-share to gallery</Label>
      <Switch id="guestbook-auto-share" checked={enabled} disabled={!ready || saving} onCheckedChange={change} aria-describedby="guestbook-auto-share-description" />
      <span className="text-sm" aria-live="polite">{saving ? 'Saving…' : enabled ? 'On' : 'Off'}</span>
    </div>
  </div>;
}
