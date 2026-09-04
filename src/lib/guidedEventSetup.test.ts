import { describe, expect, it } from 'vitest';
import {
  getGuidedCreationPlan,
  getGuidedGuestSummary,
  getGuidedStepIssues,
  getGuidedTableSummary,
  getGuidedVenueEventFields,
  normalizeDateInput,
  normalizeGuidedAnswers,
  normalizeTimeInput,
  parseBudgetAmount,
  suggestEventName,
  suggestedGuestTableCount,
  validateGuidedStep,
} from './guidedEventSetup';

describe('Guided Event Setup rules', () => {
  it('suggests useful editable event names, including correct ordinal ages', () => {
    expect(suggestEventName({ celebrationType: 'wedding', customerFirstName: 'Mia', partnerFirstName: 'Noah' })).toBe('Mia & Noah’s Wedding');
    expect(suggestEventName({ celebrationType: 'birthday', honoureeName: 'Ava', age: '21' })).toBe('Ava’s 21st Birthday');
    expect(suggestEventName({ celebrationType: 'birthday', honoureeName: 'Ava', age: '12' })).toBe('Ava’s 12th Birthday');
  });

  it('calculates guest tables after Head Table occupants', () => {
    expect(suggestedGuestTableCount({ expectedAttending: '83', headTable: 'yes', headTableCount: '10', tableCapacity: '8' })).toBe(10);
  });

  it('accepts formatted budget amounts and rejects malformed values', () => {
    expect(parseBudgetAmount('A$ 12,500.50')).toBe(12500.5);
    expect(parseBudgetAmount('-1')).toBeNull();
    expect(parseBudgetAmount('12.345')).toBeNull();
  });

  it('allows honest unknown guest estimates without inventing counts', () => {
    expect(validateGuidedStep(6, { eventFormat: 'seated', guestCountsUnsure: true })).toEqual([]);
  });

  it('enforces supported table capacities and a Head Table decision', () => {
    const base = { eventFormat: 'seated' as const, tableCreation: 'automatic' as const, tableStyle: 'round' as const, tableCapacity: '21', guestTableCount: '4' };
    expect(validateGuidedStep(7, base)).toContain('Choose whether you will have a Head Table.');
    expect(validateGuidedStep(7, { ...base, headTable: 'no' })).toContain('Round and square tables support up to 20 seats.');
  });

  it('validates exact, month/year and honestly unknown date choices', () => {
    expect(validateGuidedStep(4, { dateChoice: 'undecided', locationChoice: 'undecided' })).toEqual([]);
    expect(validateGuidedStep(4, { dateChoice: 'month', month: '10', year: '2027', locationChoice: 'in-mind' })).toEqual([]);
    expect(validateGuidedStep(4, { dateChoice: 'exact', exactDate: '2027-10-20', timesUndecided: true, rsvpUndecided: true, locationChoice: 'booked', venueName: 'The Grand Estate' })).toEqual([]);
  });

  it('accepts the exact Page 4 values from the live review and allows overnight times', () => {
    const answers = {
      dateChoice: 'exact' as const,
      exactDate: '2026-12-20',
      startTime: '04:00',
      finishTime: '23:00',
      rsvpDeadline: '2026-11-20',
      locationChoice: 'booked' as const,
      venueName: 'Sheldon Reception',
      venueAddress: '608-614 Somerville Rd',
      suburb: 'Sunshine West',
      state: 'VIC',
      postcode: '3020',
      country: 'Australia',
    };
    expect(getGuidedStepIssues(4, answers)).toEqual([]);
    expect(getGuidedStepIssues(4, { ...answers, startTime: '22:00', finishTime: '02:00' })).toEqual([]);
  });

  it('normalizes Australian display dates and 12-hour time values for native controls', () => {
    expect(normalizeDateInput('20/12/2026')).toBe('2026-12-20');
    expect(normalizeTimeInput('4:00 am')).toBe('04:00');
    expect(normalizeTimeInput('11:00 PM')).toBe('23:00');
  });

  it('returns field-level date, time and RSVP issues', () => {
    const issues = getGuidedStepIssues(4, {
      dateChoice: 'exact', exactDate: '2026-02-30', startTime: '25:00', finishTime: '',
      rsvpDeadline: '2026-13-01', locationChoice: 'undecided',
    });
    expect(issues.map((issue) => issue.field)).toEqual(['exactDate', 'startTime', 'finishTime', 'rsvpDeadline']);
  });

  it('keeps optional venue details optional while validating supplied contact details', () => {
    const tentative = { dateChoice: 'undecided' as const, locationChoice: 'in-mind' as const };
    expect(getGuidedStepIssues(4, tentative)).toEqual([]);
    expect(getGuidedStepIssues(4, { ...tentative, venuePhone: '+44 20 7946 0958', venueContactEmail: 'team@example.co.uk' })).toEqual([]);
    expect(getGuidedStepIssues(4, { ...tentative, venuePhone: 'abc', venueContactEmail: 'not-an-email' }).map((issue) => issue.field)).toEqual(['venuePhone', 'venueContactEmail']);
  });

  it('requires a booked venue name and clears hidden stale venue errors when undecided', () => {
    expect(getGuidedStepIssues(4, { dateChoice: 'undecided', locationChoice: 'booked' }).map((issue) => issue.field)).toEqual(['venueName']);
    expect(getGuidedStepIssues(4, { dateChoice: 'undecided', locationChoice: 'undecided', venuePhone: 'invalid', venueContactEmail: 'invalid', postcode: 'x' })).toEqual([]);
  });

  it('maps the full address and existing My Events venue contact fields without discarding them', () => {
    expect(getGuidedVenueEventFields({
      venueAddress: '608-614 Somerville Rd', suburb: 'Sunshine West', state: 'VIC', postcode: '3020', country: 'Australia',
      venuePhone: '03 9123 4567', venueContactName: 'Alex Smith', venueContactEmail: 'alex@example.com',
    })).toEqual({
      venueAddress: '608-614 Somerville Rd, Sunshine West, VIC, 3020, Australia',
      venuePhone: '03 9123 4567', venueContact: 'Alex Smith', venueContactEmail: 'alex@example.com',
    });
    expect(getGuidedVenueEventFields({ country: 'Australia' }).venueAddress).toBeNull();
  });

  it('requires the wedding ceremony/reception same-venue branch', () => {
    expect(validateGuidedStep(5, { celebrationType: 'wedding', partsChoice: 'ceremony-reception' })).not.toEqual([]);
    expect(validateGuidedStep(5, { celebrationType: 'wedding', partsChoice: 'ceremony-reception', sameVenue: 'undecided' })).toEqual([]);
  });

  it('maps removed legacy Page 5 draft values without losing other answers', () => {
    expect(normalizeGuidedAnswers({ partsChoice: 'combined', eventName: 'Saved event' })).toMatchObject({
      partsChoice: 'ceremony-reception', sameVenue: 'yes', eventName: 'Saved event',
    });
    expect(normalizeGuidedAnswers({ partsChoice: 'multiple', ceremonyVenue: 'Saved ceremony' })).toMatchObject({
      partsChoice: 'ceremony-reception', sameVenue: 'no', ceremonyVenue: 'Saved ceremony',
    });
  });

  it('requires all confirmed different-location fields and ignores hidden branch errors', () => {
    const base = { celebrationType: 'wedding' as const, partsChoice: 'ceremony-reception' as const };
    expect(getGuidedStepIssues(5, { ...base, sameVenue: 'no' }).map((issue) => issue.field)).toEqual([
      'ceremonyVenue', 'ceremonyAddress', 'receptionVenue', 'receptionAddress',
    ]);
    expect(getGuidedStepIssues(5, { ...base, sameVenue: 'yes' })).toEqual([]);
    expect(getGuidedStepIssues(5, { ...base, sameVenue: 'undecided' })).toEqual([]);
  });

  it('rejects a Head Table larger than expected attendance and keeps table counts whole', () => {
    const answers = { eventFormat: 'seated' as const, expectedAttending: '4', tableCreation: 'automatic' as const, tableStyle: 'round' as const, tableCapacity: '10', headTable: 'yes' as const, headTableCount: '5', guestTableCount: '0' };
    expect(getGuidedStepIssues(7, answers).map((issue) => issue.field)).toContain('headTableCount');
    expect(getGuidedStepIssues(7, { ...answers, headTableCount: '4', guestTableCount: '1.5' }).map((issue) => issue.field)).toContain('guestTableCount');
  });

  it('produces polished guest and table review summaries', () => {
    const answers = { eventFormat: 'seated' as const, approximateInvited: '120', expectedAttending: '100', tableCreation: 'automatic' as const, tableStyle: 'round' as const, guestTableCount: '10', headTable: 'yes' as const, headTableCount: '4' };
    expect(getGuidedGuestSummary(answers)).toBe('120 invited · 100 expected');
    expect(getGuidedTableSummary(answers)).toBe('10 round guest tables and one Head Table for 4 people');
    expect(getGuidedTableSummary({ ...answers, tableCreation: 'later' })).toBe('Tables will be created later');
  });

  it('does not create allocated tables for cocktail, undecided or create-later choices', () => {
    expect(getGuidedCreationPlan({ eventFormat: 'cocktail', tableCreation: 'automatic', guestTableCount: '9', headTable: 'yes' }).requestedTables).toBe(0);
    expect(getGuidedCreationPlan({ eventFormat: 'seated', tableCreation: 'later', guestTableCount: '9', headTable: 'yes' }).requestedTables).toBe(0);
    expect(getGuidedCreationPlan({ eventFormat: 'combined', tableCreation: 'automatic', guestTableCount: '9', headTable: 'yes' }).requestedTables).toBe(10);
  });

  it('preserves exact, range and undecided budget semantics without inventing amounts', () => {
    expect(getGuidedCreationPlan({ budgetChoice: 'exact', budgetExact: '15000' })).toMatchObject({ budgetKind: 'exact', budgetAmount: 15000, budgetRange: null });
    expect(getGuidedCreationPlan({ budgetChoice: '10000-15000' })).toMatchObject({ budgetKind: 'range', budgetAmount: 0, budgetRange: '10000-15000' });
    expect(getGuidedCreationPlan({ budgetChoice: 'undecided' })).toMatchObject({ budgetKind: 'undecided', budgetAmount: 0, budgetRange: null });
  });
});
