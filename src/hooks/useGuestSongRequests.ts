import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type SongRequestStatus = 'pending' | 'approved' | 'rejected';

export interface GuestSongRequestRow {
  id: string;
  event_id: string;
  guest_id: string;
  guest_name: string;
  slot_index: number;
  song_title: string;
  artist_name: string;
  music_link: string | null;
  note: string | null;
  status: SongRequestStatus;
  created_at: string;
  updated_at: string;
}

export const useGuestSongRequests = (eventId: string | null) => {
  const [rows, setRows] = useState<GuestSongRequestRow[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchAll = useCallback(async () => {
    if (!eventId) {
      setRows([]);
      return;
    }
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('guest_song_requests')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Error loading song requests:', error);
    } else {
      setRows((data || []) as GuestSongRequestRow[]);
    }
    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    if (!eventId) return;
    const channel = supabase
      .channel(`guest-song-requests:event:${eventId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'guest_song_requests', filter: `event_id=eq.${eventId}` },
        () => { fetchAll(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [eventId, fetchAll]);

  const updateStatus = async (id: string, status: SongRequestStatus) => {
    const prev = rows;
    setRows((arr) => arr.map((r) => (r.id === id ? { ...r, status } : r)));
    const { error } = await (supabase as any)
      .from('guest_song_requests')
      .update({ status })
      .eq('id', id);
    if (error) {
      setRows(prev);
      toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' });
    }
  };

  const deleteRequest = async (id: string) => {
    const prev = rows;
    setRows((arr) => arr.filter((r) => r.id !== id));
    const { error } = await (supabase as any)
      .from('guest_song_requests')
      .delete()
      .eq('id', id);
    if (error) {
      setRows(prev);
      toast({ title: 'Error', description: 'Failed to delete request', variant: 'destructive' });
    } else {
      toast({ title: 'Request deleted' });
    }
  };

  return { rows, loading, refetch: fetchAll, updateStatus, deleteRequest };
};
