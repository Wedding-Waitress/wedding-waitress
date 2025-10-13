import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

type AnalyticsType = 'view' | 'share' | 'download' | 'bulk_download';
type AnalyticsSource = 'qr' | 'link' | 'direct' | 'share_button';

interface TrackEventParams {
  galleryId: string;
  eventId?: string;
  type: AnalyticsType;
  source?: AnalyticsSource;
}

// Generate session ID (stored in sessionStorage for tracking unique visitors)
const getSessionId = () => {
  let sessionId = sessionStorage.getItem('ww_session_id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    sessionStorage.setItem('ww_session_id', sessionId);
  }
  return sessionId;
};

// Detect device type
const getDeviceType = (): 'mobile' | 'desktop' | 'tablet' => {
  const ua = navigator.userAgent;
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'tablet';
  }
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
    return 'mobile';
  }
  return 'desktop';
};

export const useTrackAnalytics = () => {
  const trackEvent = useCallback(async ({
    galleryId,
    eventId,
    type,
    source,
  }: TrackEventParams) => {
    try {
      const sessionId = getSessionId();
      const deviceType = getDeviceType();
      const referrer = document.referrer || null;
      const userAgent = navigator.userAgent;

      // Parse source from URL if not provided
      let trackSource = source;
      if (!trackSource) {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('utm_source')) {
          const utmSource = urlParams.get('utm_source');
          if (utmSource === 'share_button') trackSource = 'share_button';
          else if (utmSource === 'qr') trackSource = 'qr';
          else trackSource = 'link';
        } else {
          trackSource = 'direct';
        }
      }

      const { error } = await supabase
        .from('gallery_analytics')
        .insert({
          gallery_id: galleryId,
          event_id: eventId || null,
          type,
          source: trackSource,
          device_type: deviceType,
          referrer,
          user_agent: userAgent,
          session_id: sessionId,
        });

      if (error) {
        console.error('Analytics tracking error:', error);
      }
    } catch (error) {
      console.error('Failed to track analytics:', error);
    }
  }, []);

  return { trackEvent };
};
