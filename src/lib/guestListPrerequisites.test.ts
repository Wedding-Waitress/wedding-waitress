import { describe, expect, it } from 'vitest';
import { getGuestCreationPrerequisite } from './guestListPrerequisites';

describe('Guest List table-first prerequisite', () => {
  it('requires an event and a completed table lookup before guest creation', () => {
    expect(getGuestCreationPrerequisite(null, false, 0)).toBe('select-event');
    expect(getGuestCreationPrerequisite('event-1', true, 0)).toBe('loading-tables');
  });

  it('blocks an event with no tables and permits guest creation after one table exists', () => {
    expect(getGuestCreationPrerequisite('event-1', false, 0)).toBe('create-tables');
    expect(getGuestCreationPrerequisite('event-1', false, 1)).toBeNull();
    expect(getGuestCreationPrerequisite('event-1', false, 10)).toBeNull();
  });
});
