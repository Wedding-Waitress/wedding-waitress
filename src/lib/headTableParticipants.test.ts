import { describe, expect, it } from 'vitest';
import { getHeadParticipantReconciliationOrder, resolveHeadParticipantGuests, type HeadParticipantGuest } from './headTable';
import { calculateDashboardSeatStats } from './dashboardSeatStats';
const first = { kind: 'participant', participant: 'primary_1' };
const second = { kind: 'participant', participant: 'primary_2' };
const table = { id: 'head', event_id: 'event', user_id: 'owner', table_purpose: 'head', limit_seats: 3, head_seating_order: [second, first, { kind: 'guest', guest_id: 'child' }] };
const guest = (id: string, extra = {}): HeadParticipantGuest => ({ id, event_id: 'event', user_id: 'owner', first_name: id, table_id: null, seat_no: null, ...extra });
const guests = () => [guest('one', { first_name: 'Alex', last_name: 'Smith', guided_setup_origin: 'wedding_couple_1' }), guest('two', { first_name: 'Casey', last_name: 'Jones', guided_setup_origin: 'wedding_couple_2' }), guest('child', { table_id: 'head', seat_no: 3 })];
describe('Head Table participant reconciliation', () => {
  it('links the two existing records in the saved swapped order without moving the child in seat 3', () => {
    const people = guests();
    const next = getHeadParticipantReconciliationOrder(table, people, 'Alex Smith', 'Casey Jones ');
    expect(next).toEqual([{ kind: 'guest', guest_id: 'two' }, { kind: 'guest', guest_id: 'one' }, { kind: 'guest', guest_id: 'child' }]);
    expect(people[2].seat_no).toBe(3);
    expect(calculateDashboardSeatStats([{ ...table, head_seating_order: next }], people)).toEqual({ seatsCreated: 3, seatsFilled: 3, seatsRemaining: 0 });
    expect(getHeadParticipantReconciliationOrder({ ...table, head_seating_order: next }, people)).toBeNull();
  });
  it('uses setup origin instead of a same-name relative already seated elsewhere', () => {
    const people = [...guests(), guest('relative', { first_name: 'Casey', last_name: 'Jones', table_id: 'other', seat_no: 1 })];
    expect(resolveHeadParticipantGuests(table, people, 'Alex Smith', 'Casey Jones').primary_2?.id).toBe('two');
  });
  it('supports relationship-settings names without setup origins, but never guesses ambiguous names', () => {
    const people = guests().map(person => ({ ...person, guided_setup_origin: null }));
    expect(getHeadParticipantReconciliationOrder(table, people, ' Alex   Smith ', 'Casey Jones')).not.toBeNull();
    expect(resolveHeadParticipantGuests(table, [...people, guest('duplicate', { first_name: 'Casey', last_name: 'Jones' })], 'Alex Smith', 'Casey Jones').primary_2).toBeUndefined();
  });
  it('isolates event and owner, including stale guest arrays from a previous selected event', () => {
    expect(getHeadParticipantReconciliationOrder(table, guests().map(person => ({ ...person, event_id: 'other' })))).toBeNull();
    expect(getHeadParticipantReconciliationOrder(table, guests().map(person => ({ ...person, user_id: 'other' })))).toBeNull();
  });
  it('never overwrites intentional couple seating elsewhere or manually changed head-table seats', () => {
    const people = guests(); people[0].table_id = 'other'; people[1].table_id = 'other';
    expect(getHeadParticipantReconciliationOrder(table, people)).toBeNull();
    const shifted = guests(); shifted[2].seat_no = 2;
    expect(getHeadParticipantReconciliationOrder(table, shifted)).toBeNull();
    expect(getHeadParticipantReconciliationOrder(table, [...guests(), guest('extra', { table_id: 'head', seat_no: 1 })])).toBeNull();
  });
  it('keeps larger bridal-party head tables and centered positions intact', () => {
    const bigger = { ...table, limit_seats: 10, head_seating_order: [first, second, { kind: 'guest', guest_id: 'parent' }, { kind: 'guest', guest_id: 'child' }] };
    const people = [...guests().slice(0, 2), guest('parent', { table_id: 'head', seat_no: 6 }), guest('child', { table_id: 'head', seat_no: 7 })];
    expect(getHeadParticipantReconciliationOrder(bigger, people)).toEqual([{ kind: 'guest', guest_id: 'one' }, { kind: 'guest', guest_id: 'two' }, { kind: 'guest', guest_id: 'parent' }, { kind: 'guest', guest_id: 'child' }]);
    expect(bigger.limit_seats).toBe(10);
  });
  it('seats a couple-only table and respects a deliberately removed participant', () => {
    expect(getHeadParticipantReconciliationOrder({ ...table, limit_seats: 2, head_seating_order: [first, second] }, guests().slice(0, 2))).toHaveLength(2);
    expect(getHeadParticipantReconciliationOrder({ ...table, head_seating_order: [] }, guests())).toBeNull();
  });
  it('refuses malformed, overcapacity and duplicate legacy orders', () => {
    expect(getHeadParticipantReconciliationOrder({ ...table, limit_seats: 2 }, guests())).toBeNull();
    expect(getHeadParticipantReconciliationOrder({ ...table, head_seating_order: [first, first] }, guests())).toBeNull();
    expect(getHeadParticipantReconciliationOrder({ ...table, head_seating_order: [first, second, { kind: 'guest', guest_id: 'one' }] }, guests().slice(0, 2))).toBeNull();
  });
});

it('does not require RSVP acceptance and never infers a Head Table from a table name', () => {
  const pending = guests().map(person => ({ ...person, rsvp: 'Pending' }));
  expect(getHeadParticipantReconciliationOrder(table, pending)).not.toBeNull();
  expect(getHeadParticipantReconciliationOrder({ ...table, table_purpose: 'standard' }, pending)).toBeNull();
});
