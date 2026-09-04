import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { GuestEventOwnerError, getGuestEventOwnerId } from './guestEventOwner';

describe('getGuestEventOwnerId', () => {
  it('returns the selected event owner for owner and collaborator writes', () => {
    expect(getGuestEventOwnerId(
      { id: 'event-1', user_id: 'owner-1' },
      'event-1',
    )).toBe('owner-1');
  });

  it('rejects missing or mismatched selected-event data', () => {
    expect(() => getGuestEventOwnerId(undefined, 'event-1')).toThrow(GuestEventOwnerError);
    expect(() => getGuestEventOwnerId(
      { id: 'event-2', user_id: 'owner-1' },
      'event-1',
    )).toThrow(GuestEventOwnerError);
    expect(() => getGuestEventOwnerId(
      { id: 'event-1', user_id: '' },
      'event-1',
    )).toThrow(GuestEventOwnerError);
  });

  it('uses the verified event owner in manual, party, and import inserts', () => {
    const addGuest = fs.readFileSync(path.resolve(
      process.cwd(),
      'src/components/Dashboard/AddGuestModal.tsx',
    ), 'utf8');
    const guestList = fs.readFileSync(path.resolve(
      process.cwd(),
      'src/components/Dashboard/GuestListTable.tsx',
    ), 'utf8');

    expect(addGuest).toContain('const eventOwnerId = getGuestEventOwnerId(selectedEvent, eventId);');
    expect(addGuest.match(/user_id: eventOwnerId/g)).toHaveLength(2);
    expect(guestList).toContain(
      'const eventOwnerId = getGuestEventOwnerId(selectedEvent, selectedEventId);',
    );
    expect(guestList).toContain('user_id: eventOwnerId');
  });
});
