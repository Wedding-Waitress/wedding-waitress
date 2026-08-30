import { useEventMediaGallery } from '@/hooks/useEventMediaGallery';

export type PhotoVideoWorkspaceStatus = 'loading' | 'empty' | 'selected';
export type PhotoVideoWorkspaceSelection = {
  selectedEventId: string | null;
  selectedEvent: { id: string; name?: string | null } | null;
  selectionStatus: PhotoVideoWorkspaceStatus;
};

/**
 * Shared lifecycle for every organiser Photo & Video feature route.
 * A temporarily empty event query is loading, never a confirmed empty state.
 */
export function usePhotoVideoFeatureWorkspace(selection: PhotoVideoWorkspaceSelection) {
  const gallery = useEventMediaGallery(selection.selectedEventId);

  const status: PhotoVideoWorkspaceStatus = selection.selectionStatus === 'empty'
    ? 'empty'
    : selection.selectionStatus === 'loading' || (gallery.loading && !gallery.meta)
      ? 'loading'
      : 'selected';

  return {
    ...gallery,
    selectedEventId: selection.selectedEventId,
    selectedEvent: selection.selectedEvent,
    selectionStatus: status,
  };
}
