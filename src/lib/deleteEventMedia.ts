// Single authoritative client-side entry point for deleting general gallery media
// (shared photos, shared videos and Digital Photo Booth captures).
//
// Every delete button in the Shared Photos & Videos section goes through this function.
// It NEVER deletes private Guestbook content — the server RPC rejects those categories.
import { supabase } from '@/integrations/supabase/client';

export interface DeleteMediaResult {
  deletedIds: string[];
  failedIds: string[];
  storageFailedPaths: string[];
}

export interface InvokeLike {
  functions: {
    invoke: (
      name: string,
      opts: { body: unknown },
    ) => Promise<{ data: any; error: any }>;
  };
}

/**
 * Delete one or more media items. Resolves only when the backend has confirmed
 * the database rows are gone. Throws when nothing could be deleted.
 */
export async function deleteEventMediaItems(
  itemIds: string[],
  client: InvokeLike = supabase as unknown as InvokeLike,
): Promise<DeleteMediaResult> {
  const ids = Array.from(new Set(itemIds.filter(Boolean)));
  if (ids.length === 0) {
    return { deletedIds: [], failedIds: [], storageFailedPaths: [] };
  }

  const { data, error } = await client.functions.invoke('delete-event-media', {
    body: { itemIds: ids },
  });

  if (error) {
    const message =
      (data && typeof data === 'object' && (data as any).error) ||
      error.message ||
      'Delete failed';
    throw new Error(message);
  }

  const result: DeleteMediaResult = {
    deletedIds: Array.isArray(data?.deletedIds) ? data.deletedIds : [],
    failedIds: Array.isArray(data?.failedIds) ? data.failedIds : [],
    storageFailedPaths: Array.isArray(data?.storageFailedPaths) ? data.storageFailedPaths : [],
  };

  // A zero-row database result is a FAILURE, never a success.
  if (result.deletedIds.length === 0) {
    throw new Error(
      (data && (data as any).error) ||
        'No media was deleted. Please refresh and try again.',
    );
  }

  return result;
}
