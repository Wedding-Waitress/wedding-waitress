import { useNavigate } from 'react-router-dom';
import { Event } from './useEvents';

export const useAlbumNavigation = (selectedEventId: string | null, events: Event[]) => {
  const navigate = useNavigate();

  const getActiveEventId = (): string | null | 'no-events' => {
    // Priority 1: Currently selected event from Dashboard
    if (selectedEventId) {
      return selectedEventId;
    }

    // Priority 2: Last active event from localStorage
    const lastActiveId = localStorage.getItem('ww:last_active_event_id');
    if (lastActiveId && events.find(e => e.id === lastActiveId)) {
      return lastActiveId;
    }

    // Priority 3: User has exactly 1 event
    if (events.length === 1) {
      return events[0].id;
    }

    // Priority 4: User has multiple events (need picker)
    if (events.length > 1) {
      return null;
    }

    // Priority 5: User has no events
    return 'no-events';
  };

  const persistActiveEvent = (eventId: string) => {
    localStorage.setItem('ww:last_active_event_id', eventId);
  };

  const navigateToAlbum = (eventId: string) => {
    persistActiveEvent(eventId);
    navigate(`/album/${eventId}`);
  };

  return { getActiveEventId, navigateToAlbum, persistActiveEvent };
};
