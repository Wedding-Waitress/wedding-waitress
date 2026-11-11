import { useTranslation } from 'react-i18next';
import { publicGuestSearchRows } from '@/i18n/publicGuestSearchCopy';
import React, { useEffect, useState } from 'react';
import { Loader2, Music2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type SongRequest = { song_title: string; artist_name: string; music_link: string; note: string };

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accessToken?: string;
  guestId?: string;
  eventId?: string;
  maxRequests: number;
}

const emptyRequests = (count: number): SongRequest[] =>
  Array.from({ length: count }, () => ({ song_title: '', artist_name: '', music_link: '', note: '' }));

export function GuestSongRequestsModal({ open, onOpenChange, accessToken, guestId, eventId, maxRequests }: Props) {
  const { toast } = useToast();
  const [requests, setRequests] = useState<SongRequest[]>(() => emptyRequests(maxRequests));
  const [saving, setSaving] = useState(false);
  const [loadedTarget, setLoadedTarget] = useState('');
  const [loadFailed, setLoadFailed] = useState(false);
  const { i18n } = useTranslation();
  const copy = publicGuestSearchRows[i18n.language.split('-')[0]] || publicGuestSearchRows.en;
  const limit = Math.min(10, Math.max(0, Math.floor(maxRequests)));
  const target = [eventId, guestId, accessToken, limit].join(':');
  const ready = loadedTarget === target && !loadFailed;

  useEffect(() => {
    if (!open || !guestId || (!accessToken && !eventId) || limit < 1) return;
    let cancelled = false;
    setLoadedTarget('');
    setLoadFailed(false);
    setRequests(emptyRequests(limit));
    void (async () => {
      try {
        const { data, error } = await (supabase as any).rpc(
          accessToken ? 'get_guest_invitation_song_requests' : 'get_guest_song_requests_for_guest',
          accessToken ? { _access_token: accessToken, _guest_id: guestId } : { _event_id: eventId, _guest_id: guestId },
        );
        if (cancelled) return;
        if (error || !Array.isArray(data)) throw error || new Error('Invalid song response');
        setRequests(emptyRequests(limit).map((request, index) => {
          const saved = data.find((row: any) => row.slot_index === index);
          return { ...request, song_title: saved?.song_title || '', artist_name: saved?.artist_name || '', music_link: saved?.music_link || '', note: saved?.note || '' };
        }));
        setLoadedTarget(target);
      } catch {
        if (!cancelled) setLoadFailed(true);
      }
    })();
    return () => { cancelled = true; };
  }, [accessToken, eventId, guestId, limit, open, target]);

  const save = async () => {
    if (!guestId || (!accessToken && !eventId) || !ready || limit < 1) return;
    setSaving(true);
    try {
      const { data, error } = await (supabase as any).rpc(accessToken ? 'save_guest_invitation_song_requests' : 'submit_guest_song_requests', {
        ...(accessToken ? { _access_token: accessToken } : { _event_id: eventId }),
        _guest_id: guestId,
        _requests: requests.map((request, slot_index) => ({
          slot_index,
          song_title: request.song_title.trim(),
          artist_name: request.artist_name.trim(),
          music_link: request.music_link.trim(),
          note: request.note.trim(),
        })),
      });
      if (error || !data) throw error || new Error('Unable to save song requests');
      toast({ title: 'Song requests saved', description: 'Your requests have been sent to the DJ and MC.' });
      onOpenChange(false);
    } catch (error) {
      toast({ title: 'Unable to save song requests', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="ww-public-live-dialog max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Music2 aria-hidden="true" />Song Requests</DialogTitle>
          <DialogDescription>Request up to {limit} song{limit === 1 ? '' : 's'} for the DJ. Leave a slot blank to skip it.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {loadFailed && <p role="alert">{copy[7]}. {copy[8]}</p>}
          {!ready && !loadFailed && <Loader2 className="animate-spin" aria-label={copy[9]} />}
          {ready && requests.map((request, index) => (
            <section key={index} className="space-y-3 rounded-xl border border-primary/40 bg-background p-3">
              <Label>Song {index + 1}</Label>
              <div className="space-y-2"><Label htmlFor={`song-request-title-${index}`}>Song Title</Label><Input id={`song-request-title-${index}`} value={request.song_title} onChange={(event) => setRequests((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, song_title: event.target.value } : item))} maxLength={150} /></div>
              <div className="space-y-2"><Label htmlFor={`song-request-artist-${index}`}>Artist Name</Label><Input id={`song-request-artist-${index}`} value={request.artist_name} onChange={(event) => setRequests((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, artist_name: event.target.value } : item))} maxLength={150} /></div>
              <div className="space-y-2"><Label htmlFor={`song-request-link-${index}`}>Music Link (optional)</Label><Input id={`song-request-link-${index}`} type="url" value={request.music_link} onChange={(event) => setRequests((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, music_link: event.target.value } : item))} maxLength={500} /></div>
              <div className="space-y-2"><Label htmlFor={`song-request-note-${index}`}>Note (optional)</Label><Textarea id={`song-request-note-${index}`} value={request.note} onChange={(event) => setRequests((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, note: event.target.value } : item))} maxLength={500} rows={2} /></div>
            </section>
          ))}
          <div className="flex gap-3">
            <Button type="button" className="flex-1 bg-green-600 text-white" disabled={saving || !ready || limit < 1} onClick={save}>{saving && <Loader2 className="mr-2 animate-spin" />}Save Song Requests</Button>
            <Button type="button" variant="destructive" className="flex-1" disabled={saving} onClick={() => onOpenChange(false)}>Back</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
