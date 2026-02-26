/**
 * Simple QR code generator for invitation overlays.
 * Produces a clean black-on-transparent PNG data URL.
 */
import QRCode from 'qrcode';
import { buildGuestLookupUrl } from '@/lib/urlUtils';

export interface QrConfig {
  enabled: boolean;
  x_percent: number;   // 0-100, center of QR
  y_percent: number;   // 0-100, center of QR
  size_percent: number; // 10-30, width as % of invitation
}

export const DEFAULT_QR_CONFIG: QrConfig = {
  enabled: false,
  x_percent: 85,
  y_percent: 85,
  size_percent: 15,
};

/** Generate a QR code data URL for an event's guest lookup page */
export async function generateInvitationQR(eventSlug: string): Promise<string> {
  const url = buildGuestLookupUrl(eventSlug);
  return QRCode.toDataURL(url, {
    width: 512,
    margin: 1,
    color: { dark: '#000000', light: '#00000000' }, // transparent background
    errorCorrectionLevel: 'M',
  });
}
