import { supabase } from '@/integrations/supabase/client';
import { deleteOwnedEventRow, EventDeletionError } from './eventDeletion';
import { EVENT_IMAGE_BUCKET } from './eventImage';

const isOwnedEventImagePath = (path: string, ownerId: string, eventId: string) => {
  const segments = path.split('/');
  if (segments.length !== 4 || segments.some((segment) => !segment || segment === '.' || segment === '..')) return false;
  if (segments[0] !== ownerId) return false;
  return segments[1] === 'drafts' || (segments[1] === 'events' && segments[2] === eventId);
};

const logImageCleanupFailure = (stage: 'reference-check' | 'remove', error: unknown) => {
  const code = error && typeof error === 'object'
    ? 'code' in error ? String(error.code) : 'statusCode' in error ? String(error.statusCode) : 'status' in error ? String(error.status) : 'unknown'
    : 'unknown';
  console.warn('Event image cleanup failed after event deletion', { stage, code });
};

export const deleteOwnedEventWithImage = async (eventId: string, callerId: string) => {
  if (!callerId) throw new EventDeletionError('not-authenticated', 'Authentication required.');
  // Read the current attachment rather than relying on a potentially stale UI cache.
  const event = await supabase.from('events').select('user_id,event_image_path')
    .eq('id', eventId).maybeSingle();
  if (event.error) throw new EventDeletionError('database', event.error.message, event.error.code);
  if (!event.data?.user_id) throw new EventDeletionError('not-authorized', 'This event was not found or is not accessible to your account.');
  // A readable event can belong to another account. The RPC must authorize the
  // authenticated caller; its returned owner must match this authoritative read.
  const ownerId = event.data.user_id;
  const path = event.data.event_image_path;
  // The secure RPC remains authoritative for ownership, authorization and
  // related-record cleanup. Storage is never a prerequisite for deletion.
  const deleted = await deleteOwnedEventRow(eventId, ownerId);
  if (!path || !isOwnedEventImagePath(path, ownerId, eventId)) return deleted;

  try {
    // Do not remove an object that another surviving event still references.
    const references = await supabase.from('events').select('id').eq('event_image_path', path).limit(1);
    if (references.error) {
      logImageCleanupFailure('reference-check', references.error);
      return deleted;
    }
    if (references.data?.length) return deleted;

    const removed = await supabase.storage.from(EVENT_IMAGE_BUCKET).remove([path]);
    if (removed.error) logImageCleanupFailure('remove', removed.error);
  } catch (error) {
    logImageCleanupFailure('remove', error);
  }
  return deleted;
};
