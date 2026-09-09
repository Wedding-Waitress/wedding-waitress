import { supabase } from '@/integrations/supabase/client';
import { deleteOwnedEventRow, EventDeletionError } from './eventDeletion';
import { EVENT_IMAGE_BUCKET } from './eventImage';

export const deleteOwnedEventWithImage = async (eventId: string, ownerId: string) => {
  // Read the current attachment rather than relying on a potentially stale UI cache.
  const event = await supabase.from('events').select('event_image_path')
    .eq('id', eventId).eq('user_id', ownerId).maybeSingle();
  if (event.error) throw new EventDeletionError('database', event.error.message, event.error.code);
  if (!event.data) throw new EventDeletionError('not-authorized', 'This event was not found or is not owned by your account.');
  const path = event.data.event_image_path;
  if (!path) return deleteOwnedEventRow(eventId, ownerId);

  const references = await supabase.from('events').select('id')
    .eq('event_image_path', path).neq('id', eventId).limit(1);
  if (references.error) throw new EventDeletionError('image-cleanup', 'Unable to check the event image. Nothing was deleted. Please try again.');
  // Another event still needs this image.
  if (references.data?.length) return deleteOwnedEventRow(eventId, ownerId);

  const storage = supabase.storage.from(EVENT_IMAGE_BUCKET);
  const backup = await storage.download(path);
  if (backup.error || !backup.data) {
    throw new EventDeletionError('image-cleanup', 'Unable to prepare the event image for deletion. Nothing was deleted. Please try again.');
  }

  // Storage requires an existing owner event AND an unreferenced image.
  const detached = await supabase.from('events').update({ event_image_path: null })
    .eq('id', eventId).eq('user_id', ownerId).eq('event_image_path', path).select('id');
  if (detached.error || detached.data?.length !== 1) {
    throw new EventDeletionError('image-cleanup', 'The event image could not be prepared for deletion. Please refresh and try again.');
  }

  let imageRemoved = false;
  try {
    const removed = await storage.remove([path]);
    if (removed.error || !removed.data?.some((object) => object.name === path)) {
      throw new EventDeletionError('image-cleanup', 'The image could not be removed. The event has been kept. Please try again.');
    }
    imageRemoved = true;
    return await deleteOwnedEventRow(eventId, ownerId);
  } catch (error) {
    // Restore the attachment when deletion fails, instead of silently losing it.
    if (imageRemoved) {
      const restored = await storage.upload(path, backup.data, { contentType: backup.data.type, upsert: false });
      if (restored.error) {
        throw new EventDeletionError('image-cleanup', 'Event deletion failed, and its image could not be restored. Please upload the image again.');
      }
    }
    const linked = await supabase.from('events').update({ event_image_path: path })
      .eq('id', eventId).eq('user_id', ownerId).is('event_image_path', null).select('id');
    if (linked.error || linked.data?.length !== 1) {
      throw new EventDeletionError('image-cleanup', 'Event deletion failed, and its image attachment could not be restored. Please refresh before trying again.');
    }
    throw error;
  }
};
