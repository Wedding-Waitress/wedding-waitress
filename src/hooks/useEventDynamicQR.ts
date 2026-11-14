/**
 * Hook to fetch (or auto-create) the dynamic QR code for an event.
 * Returns the dynamic URL that should be encoded in QR images and shared.
 */
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { buildDynamicQRUrl } from '@/lib/urlUtils';

export function useEventDynamicQR(eventId: string | null) {
  const [resolved, setResolved] = useState<{ eventId: string; code: string } | null>(null);
  const code = resolved?.eventId === eventId ? resolved.code : null;
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!eventId) {
      setResolved(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchOrCreate = async () => {
      setLoading(true);
      try {
        // Try to find existing dynamic QR for this event
        const { data, error } = await supabase
          .from('dynamic_qr_codes')
          .select('code')
          .eq('current_event_id', eventId)
          .eq('is_active', true)
          .eq('destination_type', 'guest_lookup')
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (cancelled) return;
        if (error) throw error;
        if (data?.code) {
          setResolved({ eventId, code: data.code });
          setLoading(false);
          return;
        }

        // Auto-create one for legacy events
        const { data: { user } } = await supabase.auth.getUser();
        if (cancelled || !user) return;

        const { data: newCode, error: rpcErr } = await supabase.rpc('generate_dynamic_qr_code');
        if (cancelled) return;
        if (rpcErr) throw rpcErr;
        if (!newCode) return;

        const inserted = await supabase.from('dynamic_qr_codes').insert({
          code: newCode,
          user_id: user.id,
          current_event_id: eventId,
          destination_type: 'guest_lookup',
          label: 'Auto-generated',
          is_active: true,
        });

        if (inserted.error) throw inserted.error;
        if (!cancelled) setResolved({ eventId, code: newCode });
      } catch (err) {
        console.error('useEventDynamicQR error:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchOrCreate();
    return () => { cancelled = true; };
  }, [eventId]);

  return {
    code,
    dynamicUrl: code ? buildDynamicQRUrl(code) : null,
    loading,
  };
}
