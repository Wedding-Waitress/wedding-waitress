import { supabase } from '@/integrations/supabase/client';
import type { TablesInsert } from '@/integrations/supabase/types';

/** Keep older requests from overwriting a later choice, including after a failure. */
export function createQRSaveQueue() {
  let pending: Promise<unknown> = Promise.resolve();
  return <T>(save: () => Promise<T>): Promise<T> => {
    const result = pending.then(save);
    pending = result.catch(() => undefined);
    return result;
  };
}

export function ownedQRLogoPath(url: string, owner: string, eventId: string, origin: string) {
  try {
    const parsed = new URL(url);
    const prefix = `/storage/v1/object/public/qr-assets/${owner}/${eventId}/qr-logo/`;
    if (parsed.origin !== new URL(origin).origin || !parsed.pathname.startsWith(prefix)) return null;
    const filename = decodeURIComponent(parsed.pathname.slice(prefix.length));
    if (!filename || filename === '.' || filename === '..' || /[/\\]/.test(filename)) return null;
    return `${owner}/${eventId}/qr-logo/${filename}`;
  } catch { return null; }
}

/** Save the new reference first. A rejected save must leave the existing logo intact. */
export async function persistQRDesign(
  settings: TablesInsert<'qr_code_settings'>,
  uploadedLogos: Set<string>,
  currentLogo: () => string | null,
) {
  const previous = await supabase.from('qr_code_settings').select('center_image_url')
    .eq('event_id', settings.event_id).maybeSingle();
  if (previous.error) throw previous.error;
  const saved = await supabase.from('qr_code_settings').upsert(settings, { onConflict: 'event_id' });
  if (saved.error) throw saved.error;

  const candidates = new Set(uploadedLogos);
  if (previous.data?.center_image_url) candidates.add(previous.data.center_image_url);
  let cleanupFailed = false;
  for (const url of candidates) {
    if (url === settings.center_image_url || url === currentLogo()) continue;
    const path = ownedQRLogoPath(url, settings.user_id, settings.event_id, supabase.supabaseUrl);
    if (!path) continue;
    // Keep failed cleanup candidates for retry on the next saved change.
    uploadedLogos.add(url);
    try {
      const removed = await supabase.storage.from('qr-assets').remove([path]);
      if (removed.error) throw removed.error;
      uploadedLogos.delete(url);
    } catch { cleanupFailed = true; }
  }
  return { cleanupFailed };
}
