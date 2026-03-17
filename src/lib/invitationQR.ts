/**
 * Simple QR code generator for invitation overlays.
 * Produces a clean black-on-transparent PNG data URL.
 */
import QRCode from 'qrcode';
import { buildDynamicQRUrl, buildGuestLookupUrl } from '@/lib/urlUtils';
import { supabase } from '@/integrations/supabase/client';

export interface QrConfig {
  enabled: boolean;
  x_percent: number;   // 0-100, center of QR
  y_percent: number;   // 0-100, center of QR
  size_percent: number; // 10-30, width as % of invitation
  rotation: number;    // degrees
}

export const DEFAULT_QR_CONFIG: QrConfig = {
  enabled: false,
  x_percent: 85,
  y_percent: 85,
  size_percent: 15,
};

/** Generate a QR code data URL for an event's guest lookup page.
 *  Uses the dynamic QR URL if a dynamic code exists for the event, otherwise falls back to static. */
export async function generateInvitationQR(eventSlug: string, eventId?: string): Promise<string> {
  let url = buildGuestLookupUrl(eventSlug);

  // Try to resolve dynamic QR code for this event
  if (eventId) {
    try {
      const { data } = await supabase
        .from('dynamic_qr_codes')
        .select('code')
        .eq('current_event_id', eventId)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();
      if (data?.code) {
        url = buildDynamicQRUrl(data.code);
      }
    } catch { /* fall back to static */ }
  }

  return QRCode.toDataURL(url, {
    width: 512,
    margin: 1,
    color: { dark: '#000000', light: '#00000000' },
    errorCorrectionLevel: 'M',
  });
}
