import { useCallback, useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { supabase } from '@/integrations/supabase/client';
import { buildGalleryUploadUrl } from '@/lib/urlUtils';

export interface PlaceCardPhotoVideoQr {
  galleryId: string;
  token: string;
  url: string;
  dataUrl: string;
  acceptingUploads: boolean;
}

/** Read-only adapter for the existing event gallery. It never creates or rotates tokens. */
export function usePlaceCardPhotoVideoQr(eventId: string | null) {
  const [data, setData] = useState<PlaceCardPhotoVideoQr | null>(null);
  const [loading, setLoading] = useState(Boolean(eventId));
  const [error, setError] = useState<string | null>(null);
  const requestSequence = useRef(0);

  const refresh = useCallback(async () => {
    const request = ++requestSequence.current;
    if (!eventId) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { data: response, error: responseError } = await (supabase as any)
        .rpc('get_event_media_gallery_host', { _event_id: eventId });
      if (responseError) throw responseError;
      const row = Array.isArray(response) ? response[0] : response;
      if (!row?.primary_token) {
        setData(null);
        return;
      }

      const url = buildGalleryUploadUrl(row.primary_token);
      const dataUrl = await QRCode.toDataURL(url, {
        // 512 px comfortably exceeds the ~273 px needed for a 22%-wide
        // 105 mm card at 300 DPI, without multiplying export memory usage.
        width: 512,
        margin: 4,
        errorCorrectionLevel: 'H',
        color: { dark: '#000000', light: '#FFFFFF' },
      });
      if (request !== requestSequence.current) return;
      setData({
        galleryId: row.gallery_id,
        token: row.primary_token,
        url,
        dataUrl,
        acceptingUploads: Boolean(row.is_open && row.guest_upload_enabled),
      });
    } catch (reason: any) {
      if (request !== requestSequence.current) return;
      setData(null);
      setError(reason?.message || 'Could not load Photo & Video Sharing setup.');
    } finally {
      if (request === requestSequence.current) setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    setData(null);
    setError(null);
    setLoading(Boolean(eventId));
    void refresh();
    return () => { requestSequence.current += 1; };
  }, [eventId, refresh]);

  return { data, loading, error, refresh };
}
