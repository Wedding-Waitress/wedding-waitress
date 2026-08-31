import { supabase } from '@/integrations/supabase/client';

export const EVENT_DELETED_EVENT = 'ww:event-deleted';

export class EventDeletionError extends Error {
  constructor(
    public readonly reason: 'not-authenticated' | 'not-authorized' | 'not-deleted' | 'database',
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'EventDeletionError';
  }
}

export interface DeletedEventRow {
  id: string;
  user_id: string;
}

export const deleteOwnedEventRow = async (eventId: string, ownerId: string): Promise<DeletedEventRow> => {
  const deleteRpc = supabase.rpc as unknown as (
    functionName: 'delete_owned_event_secure',
    args: { p_event_id: string },
  ) => Promise<{ data: DeletedEventRow[] | null; error: { code?: string; message?: string } | null }>;
  const { data, error } = await deleteRpc('delete_owned_event_secure', { p_event_id: eventId });

  if (error) {
    if (error.code === '42501') {
      throw new EventDeletionError('not-authorized', 'You do not have permission to delete this event.', error.code);
    }
    throw new EventDeletionError('database', error.message || 'The database rejected the event deletion.', error.code);
  }

  if (!data || data.length !== 1 || data[0].id !== eventId || data[0].user_id !== ownerId) {
    throw new EventDeletionError(
      'not-deleted',
      'The event was not deleted. It may no longer exist or you may not have permission to delete it.',
    );
  }

  return data[0];
};

export const notifyEventDeleted = (eventId: string, ownerId: string, replacementId: string | null): void => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(EVENT_DELETED_EVENT, { detail: { eventId, ownerId, replacementId } }));
};

export const getEventDeletionMessage = (error: unknown): string => {
  if (error instanceof EventDeletionError) {
    if (error.reason === 'not-authenticated') return 'Please sign in again before deleting this event.';
    if (error.reason === 'not-authorized') return error.message;
    if (error.reason === 'not-deleted') return error.message;
    if (error.code === '23503') return 'This event could not be deleted because related data is preventing deletion.';
  }
  return 'Failed to delete event. Please try again.';
};
