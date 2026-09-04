export interface GuestEventOwnerSource {
  id: string;
  user_id: string;
}

export class GuestEventOwnerError extends Error {
  constructor(message = 'The selected event owner could not be verified.') {
    super(message);
    this.name = 'GuestEventOwnerError';
  }
}

export function getGuestEventOwnerId(
  event: GuestEventOwnerSource | null | undefined,
  selectedEventId: string | null | undefined,
): string {
  if (!event || !selectedEventId || event.id !== selectedEventId || !event.user_id?.trim()) {
    throw new GuestEventOwnerError();
  }

  return event.user_id;
}
