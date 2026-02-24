import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { buildSeatingChartUrl } from '@/lib/urlUtils';

export interface SeatingChartShareToken {
  id: string;
  event_id: string;
  token: string;
  recipient_name: string | null;
  permission: string;
  expires_at: string | null;
  last_accessed_at: string | null;
  created_at: string;
}

export function useSeatingChartShare(eventId: string | null) {
  const [shareTokens, setShareTokens] = useState<SeatingChartShareToken[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchShareTokens = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('seating_chart_share_tokens' as any)
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching share tokens:', error);
    } else {
      setShareTokens((data as any[]) || []);
    }
    setLoading(false);
  }, [eventId]);

  const generateShareToken = useCallback(async (
    permission: 'view_only',
    recipientName?: string,
    validityDays?: number
  ): Promise<string | null> => {
    if (!eventId) return null;
    const { data, error } = await supabase.rpc('generate_seating_chart_share_token' as any, {
      _event_id: eventId,
      _permission: permission,
      _recipient_name: recipientName || null,
      _validity_days: validityDays || 90,
    });

    if (error) {
      console.error('Error generating share token:', error);
      toast({ title: 'Error', description: 'Failed to generate share link', variant: 'destructive' });
      return null;
    }

    await fetchShareTokens();
    return data as string;
  }, [eventId, fetchShareTokens, toast]);

  const deleteShareToken = useCallback(async (tokenId: string) => {
    const { error } = await supabase
      .from('seating_chart_share_tokens' as any)
      .delete()
      .eq('id', tokenId);

    if (error) {
      console.error('Error deleting share token:', error);
      toast({ title: 'Error', description: 'Failed to delete share link', variant: 'destructive' });
    } else {
      toast({ title: 'Link Deleted', description: 'Share link has been removed' });
      await fetchShareTokens();
    }
  }, [fetchShareTokens, toast]);

  return { shareTokens, loading, fetchShareTokens, generateShareToken, deleteShareToken };
}
