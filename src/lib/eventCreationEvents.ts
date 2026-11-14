export const EVENT_CREATED_EVENT = 'ww:event-created';
export interface EventCreatedDetail { userId: string; eventId: string }

/** Invalidate account-scoped lists even while the dashboard is unmounted. */
export function notifyEventCreated(userId: string, eventId: string) {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent<EventCreatedDetail>(EVENT_CREATED_EVENT, { detail: { userId, eventId } }));
}
