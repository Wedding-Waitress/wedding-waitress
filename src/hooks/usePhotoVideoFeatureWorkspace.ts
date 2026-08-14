import { useEvents } from '@/hooks/useEvents';
import { useEventMediaGallery } from '@/hooks/useEventMediaGallery';
import { useSelectedEvent } from '@/hooks/useSelectedEvent';

export type PhotoVideoWorkspaceStatus = 'loading' | 'empty' | 'selected';

/**
 * Shared lifecycle for every organiser Photo & Video feature route.
 * A temporarily empty event query is loading, never a confirmed empty state.
 */
export function usePhotoVideoFeatureWorkspace() {
  const eventsQuery = useEvents();
  const selection = useSelectedEvent(eventsQuery.events, {
    loading: eventsQuery.loading || !eventsQuery.loaded,
  });
  const gallery = useEventMediaGallery(selection.selectedEventId);

  const status: PhotoVideoWorkspaceStatus = selection.status === 'empty'
    ? 'empty'
    : selection.status === 'loading' || (gallery.loading && !gallery.meta)
      ? 'loading'
      : 'selected';

  return {
    ...gallery,
    selectedEventId: selection.selectedEventId,
    selectedEvent: selection.selectedEvent,
    selectionStatus: status,
  };
}
