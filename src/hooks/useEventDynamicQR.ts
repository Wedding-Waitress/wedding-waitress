/**
 * Hook to fetch (or auto-create) the dynamic QR code for an event.
 * Returns the dynamic URL that should be encoded in QR images and shared.
 */
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { buildDynamicQRUrl } from '@/lib/urlUtils';

export function useEventDynamicQR(eventId: string | null) {
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!eventId) {
      setCode(null);
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
          .limit(1)
          .maybeSingle();

        if (!cancelled && data?.code) {
          setCode(data.code);
          setLoading(false);
          return;
        }

        // Auto-create one for legacy events
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) { setLoading(false); return; }

        const { data: newCode, error: rpcErr } = await supabase.rpc('generate_dynamic_qr_code');
        if (rpcErr || !newCode || cancelled) { setLoading(false); return; }

        await supabase.from('dynamic_qr_codes').insert({
          code: newCode,
          user_id: user.id,
          current_event_id: eventId,
          destination_type: 'guest_lookup',
          label: 'Auto-generated',
          is_active: true,
        });

        if (!cancelled) setCode(newCode);
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
