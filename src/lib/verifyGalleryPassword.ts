// Client entry point for public gallery password verification.
// Always goes through the rate-limited edge function — the browser is not
// permitted to call verify_event_media_password directly.
import { supabase } from '@/integrations/supabase/client';
import { getGalleryDeviceId } from '@/lib/galleryDeviceId';

export interface VerifyResult {
  ok: boolean;
  rateLimited: boolean;
  /** Server-provided retry window; never computed on the client. */
  retryAfterSeconds: number;
  error?: string;
}

export function blockedMessage(retryAfterSeconds: number): string {
  const mins = Math.max(1, Math.ceil(retryAfterSeconds / 60));
  return `Too many incorrect attempts. Please try again in ${mins} minute${mins === 1 ? '' : 's'}.`;
}

export async function verifyGalleryPassword(token: string, password: string): Promise<VerifyResult> {
  const { data, error } = await supabase.functions.invoke('verify-gallery-password', {
    body: { token, password, deviceId: getGalleryDeviceId() },
  });

  // supabase-js surfaces non-2xx as an error; recover the JSON payload for 429s.
  if (error) {
    let payload: any = null;
    try {
      payload = await (error as any)?.context?.json?.();
    } catch {
      payload = null;
    }
    if (payload?.rateLimited) {
      return { ok: false, rateLimited: true, retryAfterSeconds: Number(payload.retryAfterSeconds) || 0 };
    }
    return { ok: false, rateLimited: false, retryAfterSeconds: 0, error: 'Could not verify password' };
  }

  if (data?.rateLimited) {
    return { ok: false, rateLimited: true, retryAfterSeconds: Number(data.retryAfterSeconds) || 0 };
  }
  return { ok: data?.ok === true, rateLimited: false, retryAfterSeconds: 0 };
}
