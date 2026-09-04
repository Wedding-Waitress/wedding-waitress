import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { GuidedSetupAnswers, GuidedSetupCreationStage, GuidedSetupDraft } from './guidedEventSetup';

type Row = Record<string, unknown>;

const state = vi.hoisted(() => ({
  failOnce: '' as GuidedSetupCreationStage | '',
  events: [] as Row[],
  budgets: new Map<string, Row>(),
  tables: [] as Row[],
  guests: [] as Row[],
  qrs: [] as Row[],
  draft: {} as Row,
}));

const stageFor = (table: string, operation: string, payload?: Row): GuidedSetupCreationStage | '' => {
  if (table === 'onboarding_drafts' && operation === 'update') {
    if ('creation_started_at' in (payload || {})) return 'draft-start';
    if ('completed_at' in (payload || {})) return 'draft-completion';
    return 'draft-link';
  }
  if (table === 'events') return operation === 'insert' ? 'event-insert' : 'event-recovery';
  if (table === 'event_budget_settings') return 'budget';
  if (table === 'tables') return operation === 'insert' ? 'tables-insert' : 'tables-read';
  if (table === 'guests') return operation === 'insert' ? 'guests-insert' : 'guests-read';
  return '';
};

class Query {
  private operation = 'select';
  private payload: Row | Row[] | undefined;
  private filters = new Map<string, unknown>();

  constructor(private table: string) {}
  select() { return this; }
  insert(payload: Row | Row[]) { this.operation = 'insert'; this.payload = payload; return this; }
  update(payload: Row) { this.operation = 'update'; this.payload = payload; return this; }
  upsert(payload: Row) { this.operation = 'upsert'; this.payload = payload; return this; }
  eq(field: string, value: unknown) { this.filters.set(field, value); return this; }
  is() { return this; }
  order() { return this; }
  limit() { return this; }
  single() { return Promise.resolve(this.execute(true)); }
  maybeSingle() { return Promise.resolve(this.execute(true)); }
  then(resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) {
    return Promise.resolve(this.execute(false)).then(resolve, reject);
  }

  private execute(single: boolean) {
    const payload = Array.isArray(this.payload) ? undefined : this.payload;
    const failureStage = stageFor(this.table, this.operation, payload);
    if (state.failOnce && state.failOnce === failureStage) {
      state.failOnce = '';
      return { data: null, error: { code: 'TEST_FAILURE' } };
    }

    if (this.table === 'events') {
      if (this.operation === 'insert') {
        const event = { ...(payload || {}), id: `event-${state.events.length + 1}` };
        state.events.push(event);
        return { data: event, error: null };
      }
      const event = state.events.find((row) => [...this.filters].every(([key, value]) => row[key] === value)) || null;
      return { data: single ? event : event ? [event] : [], error: null };
    }
    if (this.table === 'onboarding_drafts' && this.operation === 'update') {
      Object.assign(state.draft, payload);
      return { data: state.draft, error: null };
    }
    if (this.table === 'event_budget_settings' && this.operation === 'upsert') {
      state.budgets.set(String(payload?.event_id), { ...payload });
      return { data: payload, error: null };
    }
    if (this.table === 'tables') {
      if (this.operation === 'insert') state.tables.push(...(this.payload as Row[]));
      const rows = state.tables.filter((row) => [...this.filters].every(([key, value]) => row[key] === value));
      return { data: rows, error: null };
    }
    if (this.table === 'guests') {
      if (this.operation === 'insert') {
        const guest: Row = { ...(payload || {}), id: `guest-${state.guests.length + 1}` };
        const duplicate = state.guests.some((row) => row.event_id === guest.event_id && row.guided_setup_origin === guest.guided_setup_origin);
        if (duplicate) return { data: null, error: { code: '23505' } };
        state.guests.push(guest);
        return { data: guest, error: null };
      }
      const rows = state.guests.filter((row) => [...this.filters].every(([key, value]) => row[key] === value));
      return { data: single ? rows[0] || null : rows, error: null };
    }
    if (this.table === 'dynamic_qr_codes') {
      if (this.operation === 'insert') state.qrs.push(payload || {});
      const rows = state.qrs.filter((row) => [...this.filters].every(([key, value]) => row[key] === value));
      return { data: single ? rows[0] || null : rows, error: null };
    }
    return { data: single ? null : [], error: null };
  }
}

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'owner-1' } } })) },
    from: (table: string) => new Query(table),
    rpc: vi.fn(async () => ({ data: 'qr-code-1', error: null })),
  },
}));

vi.mock('@/lib/eventAllowance', () => ({
  getEventAllowanceSnapshot: vi.fn(async () => ({ canCreate: true, atCap: false })),
  getEventCreationBlockMessage: vi.fn(() => 'Event limit reached.'),
  getDatabaseEventCreationError: vi.fn(() => null),
}));

vi.mock('@/hooks/useSelectedEvent', () => ({ setSelectedEventId: vi.fn() }));

import { completeGuidedSetup, GuidedSetupCreationError } from './guidedEventSetup';

const answers = (overrides: Partial<GuidedSetupAnswers> = {}): GuidedSetupAnswers => ({
  celebrationType: 'wedding', customerFirstName: 'Nader', partnerFirstName: 'Nahla', eventName: 'Nader & Nahla Wedding',
  eventImagePath: 'owner-1/drafts/draft-1/event.jpg', eventImageFit: 'cover', eventImagePositionX: 42,
  eventImagePositionY: 63, eventImageZoom: 150, dateChoice: 'undecided', locationChoice: 'undecided',
  partsChoice: 'ceremony-reception', sameVenue: 'undecided', eventFormat: 'seated', approximateInvited: '120',
  expectedAttending: '100', adults: '85', children: '10', vendors: '5', tableCreation: 'automatic',
  tableStyle: 'round', tableCapacity: '10', headTable: 'yes', headTableCount: '4', guestTableCount: '10',
  budgetChoice: 'exact', budgetExact: '35000', ...overrides,
});

const draft = (draftAnswers = answers()): GuidedSetupDraft => ({
  id: 'draft-1', user_id: 'owner-1', mode: 'additional_event', current_step: 9, answers: draftAnswers,
  created_event_id: null, creation_started_at: null, completed_at: null,
  created_at: '2026-09-02T00:00:00Z', updated_at: '2026-09-02T00:00:00Z',
});

describe('Guided Setup completion recovery', () => {
  beforeEach(() => {
    state.failOnce = '';
    state.events = [];
    state.budgets = new Map();
    state.tables = [];
    state.guests = [];
    state.qrs = [];
    state.draft = { id: 'draft-1' };
  });

  it('creates the screenshot event with image crop, budget, one long Head Table and ten guest tables', async () => {
    await expect(completeGuidedSetup(draft(), 100, 20)).resolves.toBe('event-1');
    expect(state.events).toHaveLength(1);
    expect(state.events[0]).toMatchObject({ event_image_path: 'owner-1/drafts/draft-1/event.jpg', event_image_fit: 'cover', event_image_position_x: 42, event_image_position_y: 63, event_image_zoom: 150 });
    expect(state.budgets.get('event-1')).toMatchObject({ anticipated_budget: 35000, currency: 'AUD' });
    expect(state.tables).toHaveLength(11);
    expect(state.tables.filter((table) => table.table_purpose === 'head')).toEqual([expect.objectContaining({ table_type: 'long', limit_seats: 4 })]);
    expect(state.qrs).toHaveLength(1);
    expect(state.guests).toEqual([
      expect.objectContaining({ first_name: 'Nader', last_name: null, guided_setup_origin: 'wedding_couple_1', assigned: false, table_id: null, table_no: null, seat_no: null, email: null, mobile: null, rsvp: null, dietary: null }),
      expect.objectContaining({ first_name: 'Nahla', last_name: null, guided_setup_origin: 'wedding_couple_2', assigned: false, table_id: null, table_no: null, seat_no: null, email: null, mobile: null, rsvp: null, dietary: null }),
    ]);
    expect(state.draft).toMatchObject({ created_event_id: 'event-1', current_step: 10 });
  });

  it('creates no image or tables when the customer chooses to create tables later', async () => {
    await completeGuidedSetup(draft(answers({ eventImagePath: undefined, tableCreation: 'later' })), 100, 20);
    expect(state.events[0].event_image_path).toBeNull();
    expect(state.tables).toHaveLength(0);
  });

  it.each<GuidedSetupCreationStage>([
    'draft-start', 'event-recovery', 'event-insert', 'draft-link', 'budget', 'tables-read', 'tables-insert', 'guests-read', 'guests-insert', 'draft-completion',
  ])('recovers after a %s failure without duplicate records', async (stage) => {
    state.failOnce = stage;
    await expect(completeGuidedSetup(draft(), 100, 20)).rejects.toEqual(expect.objectContaining({ name: GuidedSetupCreationError.name, stage }));
    await expect(completeGuidedSetup(draft(), 100, 20)).resolves.toBe('event-1');
    await expect(completeGuidedSetup(draft(), 100, 20)).resolves.toBe('event-1');
    expect(state.events).toHaveLength(1);
    expect(state.budgets.size).toBe(1);
    expect(state.tables).toHaveLength(11);
    expect(state.tables.filter((table) => table.table_purpose === 'head')).toHaveLength(1);
    expect(state.qrs).toHaveLength(1);
    expect(state.guests).toHaveLength(2);
  });

  it.each([
    ['engagement', ['engagement_couple_1', 'engagement_couple_2']],
    ['birthday', ['birthday_celebrant']],
    ['corporate', []],
    ['school', []],
    ['christmas', []],
    ['other', []],
  ] as const)('creates only the approved automatic guests for %s events', async (celebrationType, origins) => {
    const typeAnswers = answers({
      celebrationType,
      customerSurname: 'Elalfy',
      partnerSurname: 'Megm',
      honoureeName: 'Jordan Taylor',
      organiserName: 'Nader Elalfy',
      otherEventType: 'Anniversary',
      tableCreation: 'later',
    });
    await completeGuidedSetup(draft(typeAnswers), 100, 20);
    expect(state.guests.map((guest) => guest.guided_setup_origin)).toEqual(origins);
    if (celebrationType === 'birthday') {
      expect(state.guests[0]).toMatchObject({ first_name: 'Jordan Taylor', last_name: null });
    }
    if (celebrationType === 'engagement') {
      expect(state.guests.map((guest) => [guest.first_name, guest.last_name])).toEqual([['Nader', 'Elalfy'], ['Nahla', 'Megm']]);
    }
  });

  it('preserves a manually created same-name guest while reconciling by origin', async () => {
    state.guests.push({ id: 'manual-1', event_id: 'event-1', user_id: 'owner-1', first_name: 'Nader', last_name: 'Elalfy', guided_setup_origin: null });
    await completeGuidedSetup(draft(answers({ customerSurname: 'Elalfy', partnerSurname: 'Megm' })), 100, 20);
    await completeGuidedSetup(draft(answers({ customerSurname: 'Elalfy', partnerSurname: 'Megm' })), 100, 20);
    expect(state.guests).toHaveLength(3);
    expect(state.guests.filter((guest) => guest.guided_setup_origin === null)).toHaveLength(1);
  });
});
