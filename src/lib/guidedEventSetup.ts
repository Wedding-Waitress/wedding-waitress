import { supabase } from '@/integrations/supabase/client';
import {
  getDatabaseEventCreationError,
  getEventAllowanceSnapshot,
  getEventCreationBlockMessage,
} from '@/lib/eventAllowance';
import { defaultHeadSeatingOrder } from '@/lib/headTable';
import { setSelectedEventId } from '@/hooks/useSelectedEvent';
import type { Json } from '@/integrations/supabase/types';
import type { EventImageFit, EventImageValue } from '@/lib/eventImage';
import { GuidedSetupGuestError, reconcileGuidedSetupGuests } from '@/lib/guidedSetupGuests';

export const GUIDED_SETUP_ROUTE = '/onboarding/event-setup';

export type GuidedSetupMode = 'first_event' | 'additional_event';
export type CelebrationType = 'wedding' | 'engagement' | 'birthday' | 'corporate' | 'school' | 'christmas' | 'other';
export type DateChoice = 'exact' | 'month' | 'undecided';
export type EventFormat = 'seated' | 'cocktail' | 'combined' | 'undecided';
export type BudgetChoice = 'under-5000' | '5000-10000' | '10000-15000' | '15000-20000' | '20000-25000' | '25000-30000' | 'over-30000' | 'undecided' | 'exact';
export type GuidedSetupCreationStage = 'draft-start' | 'event-recovery' | 'event-insert' | 'draft-link' | 'budget' | 'tables-read' | 'tables-insert' | 'guests-read' | 'guests-insert' | 'draft-completion';

export class GuidedSetupCreationError extends Error {
  constructor(public readonly stage: GuidedSetupCreationStage, message: string) {
    super(message);
    this.name = 'GuidedSetupCreationError';
  }
}

export interface GuidedSetupAnswers {
  celebrationType?: CelebrationType;
  otherEventType?: string;
  customerFirstName?: string;
  customerSurname?: string;
  partnerFirstName?: string;
  partnerSurname?: string;
  honoureeName?: string;
  age?: string;
  organiserName?: string;
  organisationName?: string;
  eventName?: string;
  eventImagePath?: string;
  eventImageFit?: EventImageFit;
  eventImagePositionX?: number;
  eventImagePositionY?: number;
  eventImageZoom?: number;
  dateChoice?: DateChoice;
  exactDate?: string;
  month?: string;
  year?: string;
  startTime?: string;
  finishTime?: string;
  timesUndecided?: boolean;
  rsvpDeadline?: string;
  rsvpUndecided?: boolean;
  locationChoice?: 'booked' | 'in-mind' | 'undecided';
  venueName?: string;
  venueAddress?: string;
  suburb?: string;
  state?: string;
  postcode?: string;
  country?: string;
  venueContactName?: string;
  venuePhone?: string;
  venueContactEmail?: string;
  partsChoice?: 'ceremony-reception' | 'ceremony-only' | 'reception-only' | 'combined' | 'one-location' | 'multiple' | 'undecided';
  sameVenue?: 'yes' | 'no' | 'undecided';
  ceremonyVenue?: string;
  ceremonyAddress?: string;
  receptionVenue?: string;
  receptionAddress?: string;
  eventFormat?: EventFormat;
  approximateInvited?: string;
  expectedAttending?: string;
  adults?: string;
  children?: string;
  vendors?: string;
  guestCountsUnsure?: boolean;
  tableStyle?: 'round' | 'square' | 'long' | 'mixed';
  tableCapacity?: string;
  headTable?: 'yes' | 'no';
  headTableCount?: string;
  guestTableCount?: string;
  tableCreation?: 'automatic' | 'later';
  budgetChoice?: BudgetChoice;
  budgetExact?: string;
}

export interface GuidedSetupDraft {
  id: string;
  user_id: string;
  mode: GuidedSetupMode;
  current_step: number;
  answers: GuidedSetupAnswers;
  created_event_id: string | null;
  creation_started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export const CELEBRATION_LABELS: Record<CelebrationType, string> = {
  wedding: 'Wedding', engagement: 'Engagement', birthday: 'Birthday', corporate: 'Corporate Event',
  school: 'School Event', christmas: 'Christmas Party', other: 'Other Event',
};

export const getGuidedEventImageHeading = (type?: CelebrationType) => {
  if (type === 'wedding' || type === 'engagement') return 'Add a photo of you both';
  if (type === 'birthday') return 'Add an event or celebration photo';
  return 'Add an event photo or logo';
};

export const getGuidedEventImageValue = (answers: GuidedSetupAnswers): EventImageValue | null => answers.eventImagePath ? {
  path: answers.eventImagePath,
  fit: answers.eventImageFit === 'contain' ? 'contain' : 'cover',
  positionX: answers.eventImagePositionX ?? 50,
  positionY: answers.eventImagePositionY ?? 50,
  zoom: answers.eventImageZoom ?? 100,
} : null;

export const BUDGET_LABELS: Record<BudgetChoice, string> = {
  'under-5000': 'Under $5,000', '5000-10000': '$5,000–$10,000', '10000-15000': '$10,000–$15,000',
  '15000-20000': '$15,000–$20,000', '20000-25000': '$20,000–$25,000', '25000-30000': '$25,000–$30,000',
  'over-30000': 'More than $30,000', undecided: 'We haven’t decided yet', exact: 'Enter an exact amount',
};

const positiveInt = (value?: string) => value !== undefined && value !== '' && Number.isInteger(Number(value)) && Number(value) >= 0;
const hasText = (value?: string) => Boolean(value?.trim());
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const isCoupleCelebration = (type?: CelebrationType) => type === 'wedding' || type === 'engagement';

export interface GuidedValidationIssue {
  field: string;
  label: string;
  message: string;
}

export const normalizeDateInput = (value?: string) => {
  const input = value?.trim() ?? '';
  if (!input) return '';
  if (ISO_DATE_PATTERN.test(input)) return input;
  const australian = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(input);
  if (!australian) return input;
  const [, day, month, year] = australian;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

export const normalizeTimeInput = (value?: string) => {
  const input = value?.trim() ?? '';
  if (!input) return '';
  if (TIME_PATTERN.test(input)) return input;
  const twelveHour = /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i.exec(input);
  if (!twelveHour) return input;
  const [, hoursText, minutes = '00', meridiem] = twelveHour;
  const hours = Number(hoursText);
  if (hours < 1 || hours > 12 || Number(minutes) > 59) return input;
  const normalizedHours = (hours % 12) + (meridiem.toLowerCase() === 'pm' ? 12 : 0);
  return `${String(normalizedHours).padStart(2, '0')}:${minutes}`;
};

const isValidDate = (value?: string) => {
  const normalized = normalizeDateInput(value);
  if (!ISO_DATE_PATTERN.test(normalized)) return false;
  const [year, month, day] = normalized.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
};

const isValidTime = (value?: string) => TIME_PATTERN.test(normalizeTimeInput(value));
const isValidEmail = (value?: string) => !hasText(value) || EMAIL_PATTERN.test(value!.trim());
const isValidPhone = (value?: string) => {
  if (!hasText(value)) return true;
  const phone = value!.trim();
  if (!/^\+?[\d\s().-]+$/.test(phone)) return false;
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
};
const isValidPostcode = (value?: string, country?: string) => {
  if (!hasText(value)) return true;
  if (!country || /australia/i.test(country)) return /^\d{4}$/.test(value!.trim());
  return /^[A-Za-z0-9][A-Za-z0-9 -]{1,9}$/.test(value!.trim());
};

export const normalizeGuidedAnswers = (answers: GuidedSetupAnswers): GuidedSetupAnswers => {
  const legacyParts = answers.partsChoice;
  const partsChoice = legacyParts === 'combined'
    ? 'ceremony-reception'
    : legacyParts === 'one-location'
      ? 'reception-only'
      : legacyParts === 'multiple'
        ? 'ceremony-reception'
        : legacyParts;
  const sameVenue = legacyParts === 'combined'
    ? 'yes'
    : legacyParts === 'multiple'
      ? 'no'
      : answers.sameVenue;

  return {
    ...answers,
    partsChoice,
    sameVenue,
    exactDate: answers.exactDate ? normalizeDateInput(answers.exactDate) : answers.exactDate,
    rsvpDeadline: answers.rsvpDeadline ? normalizeDateInput(answers.rsvpDeadline) : answers.rsvpDeadline,
    startTime: answers.startTime ? normalizeTimeInput(answers.startTime) : answers.startTime,
    finishTime: answers.finishTime ? normalizeTimeInput(answers.finishTime) : answers.finishTime,
  };
};
export const parseBudgetAmount = (value?: string) => {
  const normalized = value?.trim().replace(/^(?:AUD|A\$|\$)\s*/i, '').replace(/[,\s]/g, '') ?? '';
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const amount = Number(normalized);
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
};

export const suggestedGuestTableCount = (answers: GuidedSetupAnswers) => {
  const attending = Math.max(0, Number(answers.expectedAttending || 0));
  const head = answers.headTable === 'yes' ? Math.max(0, Number(answers.headTableCount || 0)) : 0;
  const capacity = Math.max(1, Number(answers.tableCapacity || 0));
  return Math.ceil(Math.max(0, attending - head) / capacity);
};

export const suggestEventName = (answers: GuidedSetupAnswers) => {
  const type = answers.celebrationType;
  if (isCoupleCelebration(type)) {
    const people = [answers.customerFirstName, answers.partnerFirstName].filter(hasText).join(' & ');
    return people ? `${people}’s ${type === 'wedding' ? 'Wedding' : 'Engagement'}` : '';
  }
  if (type === 'birthday' && hasText(answers.honoureeName)) {
    const age = Number(answers.age);
    const suffix = age % 100 >= 11 && age % 100 <= 13 ? 'th' : age % 10 === 1 ? 'st' : age % 10 === 2 ? 'nd' : age % 10 === 3 ? 'rd' : 'th';
    return `${answers.honoureeName}’s${hasText(answers.age) ? ` ${answers.age}${suffix}` : ''} Birthday`;
  }
  return answers.eventName ?? '';
};

export const getGuidedStepIssues = (step: number, rawAnswers: GuidedSetupAnswers): GuidedValidationIssue[] => {
  const answers = normalizeGuidedAnswers(rawAnswers);
  const issues: GuidedValidationIssue[] = [];
  const add = (field: string, label: string, message: string) => issues.push({ field, label, message });

  if (step === 2) {
    if (!answers.celebrationType) add('celebrationType', 'Event type', 'Choose the type of event you are planning.');
    if (answers.celebrationType === 'other' && !hasText(answers.otherEventType)) add('otherEventType', 'Event type detail', 'Tell us what type of event you are planning.');
  }
  if (step === 3) {
    if (isCoupleCelebration(answers.celebrationType) && !hasText(answers.customerFirstName)) add('customerFirstName', 'Your first name', 'Enter your first name.');
    if (isCoupleCelebration(answers.celebrationType) && !hasText(answers.partnerFirstName)) add('partnerFirstName', "Your partner's first name", "Enter your partner's first name.");
    if (answers.celebrationType === 'birthday' && !hasText(answers.honoureeName)) add('honoureeName', 'Person celebrating', 'Enter the name of the person celebrating.');
    if (!isCoupleCelebration(answers.celebrationType) && answers.celebrationType !== 'birthday' && !hasText(answers.organiserName)) add('organiserName', "Organiser's name", "Enter the organiser's name.");
    if (!hasText(answers.eventName)) add('eventName', 'Event name', 'Enter an event name.');
  }
  if (step === 4) {
    if (!answers.dateChoice) add('dateChoice', 'Date', 'Choose how certain you are about the event date.');
    if (answers.dateChoice === 'exact') {
      if (!hasText(answers.exactDate)) add('exactDate', 'Event date', 'Enter the event date.');
      else if (!isValidDate(answers.exactDate)) add('exactDate', 'Event date', 'Enter a valid event date.');
      if (!answers.timesUndecided) {
        if (!hasText(answers.startTime)) add('startTime', 'Start time', 'Enter the start time or choose that times are not decided.');
        else if (!isValidTime(answers.startTime)) add('startTime', 'Start time', 'Enter a valid start time.');
        if (!hasText(answers.finishTime)) add('finishTime', 'Finish time', 'Enter the finish time or choose that times are not decided.');
        else if (!isValidTime(answers.finishTime)) add('finishTime', 'Finish time', 'Enter a valid finish time.');
      }
      if (!answers.rsvpUndecided) {
        if (!hasText(answers.rsvpDeadline)) add('rsvpDeadline', 'RSVP deadline', 'Enter the RSVP deadline or choose that it is not decided.');
        else if (!isValidDate(answers.rsvpDeadline)) add('rsvpDeadline', 'RSVP deadline', 'Enter a valid RSVP deadline.');
        else if (isValidDate(answers.exactDate) && answers.rsvpDeadline! > answers.exactDate!) add('rsvpDeadline', 'RSVP deadline', 'The RSVP deadline must be on or before the event date.');
      }
    }
    if (answers.dateChoice === 'month') {
      if (!answers.month || Number(answers.month) < 1 || Number(answers.month) > 12) add('month', 'Month', 'Choose the event month.');
      if (!/^\d{4}$/.test(answers.year || '')) add('year', 'Year', 'Enter a four-digit event year.');
    }
    if (!answers.locationChoice) add('locationChoice', 'Location', 'Choose the current venue or location status.');
    if (answers.locationChoice === 'booked' && !hasText(answers.venueName)) add('venueName', 'Venue name', 'Enter the booked venue name.');
    if (answers.locationChoice && answers.locationChoice !== 'undecided') {
      if (!isValidPhone(answers.venuePhone)) add('venuePhone', 'Venue telephone or mobile', 'Enter a valid telephone or mobile number.');
      if (!isValidEmail(answers.venueContactEmail)) add('venueContactEmail', 'Venue contact email', 'Enter a valid email address.');
      if (!isValidPostcode(answers.postcode, answers.country)) add('postcode', 'Postcode', answers.country && !/australia/i.test(answers.country) ? 'Enter a valid postcode.' : 'Enter a four-digit Australian postcode.');
    }
  }
  if (step === 5 && !answers.partsChoice) add('partsChoice', 'Celebration', 'Choose which parts of the celebration you are planning.');
  if (step === 5 && answers.partsChoice === 'ceremony-reception' && !answers.sameVenue) add('sameVenue', 'Ceremony and reception locations', 'Choose whether the ceremony and reception are at the same location.');
  if (step === 5 && answers.partsChoice === 'ceremony-reception' && answers.sameVenue === 'no') {
    if (!hasText(answers.ceremonyVenue)) add('ceremonyVenue', 'Ceremony location name', 'Enter the ceremony location name.');
    if (!hasText(answers.ceremonyAddress)) add('ceremonyAddress', 'Ceremony address', 'Enter the ceremony address.');
    if (!hasText(answers.receptionVenue)) add('receptionVenue', 'Reception location name', 'Enter the reception location name.');
    if (!hasText(answers.receptionAddress)) add('receptionAddress', 'Reception address', 'Enter the reception address.');
  }
  if (step === 6) {
    if (!answers.eventFormat) add('eventFormat', 'Guest format', 'Choose how guests will be celebrating.');
    if (!answers.guestCountsUnsure) {
      if (!positiveInt(answers.approximateInvited)) add('approximateInvited', 'Approximate number invited', 'Enter a whole number, or choose that guest numbers are not known.');
      if (!positiveInt(answers.expectedAttending)) add('expectedAttending', 'Expected number attending', 'Enter a whole number, or choose that guest numbers are not known.');
      for (const [field, label] of [['adults', 'Adults'], ['children', 'Children'], ['vendors', 'Vendors or event staff']] as const) {
        if (hasText(answers[field]) && !positiveInt(answers[field])) add(field, label, 'Enter a whole number of zero or more.');
      }
    }
  }
  if (step === 7 && (answers.eventFormat === 'seated' || answers.eventFormat === 'combined')) {
    if (!answers.tableCreation) add('tableCreation', 'Table creation', 'Choose whether to create tables now or later.');
    if (answers.tableCreation === 'automatic' && !answers.tableStyle) add('tableStyle', 'Preferred table style', 'Choose a preferred table style.');
    if (answers.tableCreation === 'automatic' && !answers.headTable) add('headTable', 'Head Table', 'Choose whether you will have a Head Table.');
    if (answers.tableCreation === 'automatic' && (!positiveInt(answers.tableCapacity) || Number(answers.tableCapacity) < 1)) add('tableCapacity', 'Typical guests per table', 'Enter at least one guest per table.');
    if (answers.tableCreation === 'automatic' && !positiveInt(answers.guestTableCount)) add('guestTableCount', 'Guest tables', 'Enter the number of guest tables to create.');
    const maximumCapacity = answers.tableStyle === 'long' ? 50 : 20;
    if (answers.tableCreation === 'automatic' && Number(answers.tableCapacity) > maximumCapacity) add('tableCapacity', 'Typical guests per table', `${answers.tableStyle === 'long' ? 'Long' : 'Round and square'} tables support up to ${maximumCapacity} seats.`);
    if (answers.tableCreation === 'automatic' && answers.headTable === 'yes' && (!positiveInt(answers.headTableCount) || Number(answers.headTableCount) < 1)) add('headTableCount', 'People at the Head Table', 'Enter the Head Table capacity.');
    if (answers.tableCreation === 'automatic' && answers.headTable === 'yes' && positiveInt(answers.headTableCount) && Number(answers.headTableCount) > Number(answers.expectedAttending || 0)) add('headTableCount', 'People at the Head Table', 'The Head Table cannot seat more people than the expected attendance.');
  }
  if (step === 8 && !answers.budgetChoice) add('budgetChoice', 'Overall planned budget', 'Choose a budget option.');
  if (step === 8 && answers.budgetChoice === 'exact' && parseBudgetAmount(answers.budgetExact) === null) add('budgetExact', 'Exact amount', 'Enter a valid non-negative amount.');
  return issues;
};

export const validateGuidedStep = (step: number, answers: GuidedSetupAnswers): string[] => getGuidedStepIssues(step, answers).map((issue) => issue.message);

export const loadActiveGuidedSetup = async (userId: string, mode?: GuidedSetupMode) => {
  let query = supabase.from('onboarding_drafts').select('*').eq('user_id', userId).is('completed_at', null).order('updated_at', { ascending: false }).limit(1);
  if (mode) query = query.eq('mode', mode);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data as unknown as GuidedSetupDraft | null;
};

export const beginGuidedSetup = async (userId: string, mode: GuidedSetupMode, answers: GuidedSetupAnswers = {}) => {
  const existing = await loadActiveGuidedSetup(userId, mode);
  if (existing) return existing;
  const { data, error } = await supabase.from('onboarding_drafts').insert({ user_id: userId, mode, answers: answers as unknown as Json, current_step: 1 }).select().single();
  if (error) {
    if ((error as { code?: string }).code === '23505') return loadActiveGuidedSetup(userId, mode);
    throw error;
  }
  return data as unknown as GuidedSetupDraft;
};

export const saveGuidedSetup = async (draftId: string, answers: GuidedSetupAnswers, currentStep: number) => {
  const { data, error } = await supabase.from('onboarding_drafts').update({ answers: answers as unknown as Json, current_step: currentStep }).eq('id', draftId).select().single();
  if (error) throw error;
  return data as unknown as GuidedSetupDraft;
};

const eventSections = (answers: GuidedSetupAnswers) => {
  if (answers.celebrationType === 'wedding') {
    return {
      ceremony: ['ceremony-reception', 'ceremony-only'].includes(answers.partsChoice || ''),
      reception: answers.partsChoice !== 'ceremony-only',
    };
  }
  return { ceremony: answers.partsChoice === 'multiple', reception: true };
};

export const PARTS_LABELS: Record<NonNullable<GuidedSetupAnswers['partsChoice']>, string> = {
  'ceremony-reception': 'Ceremony and reception',
  'ceremony-only': 'Ceremony only',
  'reception-only': 'Reception only',
  combined: 'Ceremony and reception',
  'one-location': 'One event in one location',
  multiple: 'More than one part or location',
  undecided: 'We haven’t decided yet',
};

export const EVENT_FORMAT_LABELS: Record<EventFormat, string> = {
  seated: 'Sit-down event with tables',
  cocktail: 'Stand-up cocktail event without allocated tables',
  combined: 'A combination of seated and cocktail',
  undecided: 'We haven’t decided yet',
};

export const getGuidedGuestSummary = (answers: GuidedSetupAnswers) => {
  if (answers.guestCountsUnsure) return 'Guest numbers not decided yet';
  return `${Number(answers.approximateInvited || 0)} invited · ${Number(answers.expectedAttending || 0)} expected`;
};

export const getGuidedTableSummary = (answers: GuidedSetupAnswers) => {
  if (answers.tableCreation !== 'automatic' || !['seated', 'combined'].includes(answers.eventFormat || '')) return 'Tables will be created later';
  const count = Number(answers.guestTableCount || 0);
  const shape = answers.tableStyle === 'mixed' ? 'mixed' : answers.tableStyle || 'round';
  const guestTables = `${count} ${shape} guest ${count === 1 ? 'table' : 'tables'}`;
  return answers.headTable === 'yes'
    ? `${guestTables} and one Head Table for ${Number(answers.headTableCount || 0)} people`
    : guestTables;
};

const creationFailureMessages: Record<GuidedSetupCreationStage, string> = {
  'draft-start': 'Your setup could not be prepared for completion. Your answers and photo are safe. Please try again.',
  'event-recovery': 'We could not safely resume event creation. Your answers and photo are safe. Please try again.',
  'event-insert': 'Your event could not be saved right now. Your answers and photo are safe. Please try again.',
  'draft-link': 'Your event was saved, but setup could not be linked for recovery. Please try again.',
  budget: 'Your event was saved, but its budget could not be prepared. Please try again to finish setup.',
  'tables-read': 'Your event was saved, but existing tables could not be checked. Please try again to finish setup.',
  'tables-insert': 'Your event was saved, but the starting tables could not be prepared. Please try again to finish setup.',
  'guests-read': 'Your event was saved, but existing event people could not be checked. Please try again to finish setup.',
  'guests-insert': 'Your event was saved, but the event people could not be added to the Guest List. Please try again to finish setup.',
  'draft-completion': 'Your event is nearly ready, but setup could not be finalised. Please try again.',
};

const throwCreationFailure = (stage: GuidedSetupCreationStage, error: unknown): never => {
  const code = typeof error === 'object' && error && 'code' in error ? String((error as { code?: unknown }).code || '') : '';
  console.error('Guided Setup persistence failed', { stage, code: code || 'unknown' });
  throw new GuidedSetupCreationError(stage, creationFailureMessages[stage]);
};

export const getGuidedVenueAddress = (answers: GuidedSetupAnswers) => {
  const addressParts = [answers.venueAddress, answers.suburb, answers.state, answers.postcode]
    .map((part) => part?.trim()).filter(Boolean);
  if (!addressParts.length) return '';
  return [...addressParts, answers.country?.trim()].filter(Boolean).join(', ');
};

export const getGuidedVenueEventFields = (answers: GuidedSetupAnswers) => ({
  venueAddress: getGuidedVenueAddress(answers) || null,
  venuePhone: answers.venuePhone?.trim() || null,
  venueContact: answers.venueContactName?.trim() || null,
  venueContactEmail: answers.venueContactEmail?.trim() || null,
});

export const getGuidedCreationPlan = (answers: GuidedSetupAnswers) => {
  const createTables = answers.tableCreation === 'automatic' && ['seated', 'combined'].includes(answers.eventFormat || '');
  const guestTables = createTables ? Number(answers.guestTableCount || 0) : 0;
  const headTables = createTables && answers.headTable === 'yes' ? 1 : 0;
  const budgetKind = answers.budgetChoice === 'exact' ? 'exact' : answers.budgetChoice === 'undecided' ? 'undecided' : 'range';
  return {
    sections: eventSections(answers),
    guestTables,
    headTables,
    requestedTables: guestTables + headTables,
    budgetKind: budgetKind as 'exact' | 'range' | 'undecided',
    budgetAmount: budgetKind === 'exact' ? parseBudgetAmount(answers.budgetExact) || 0 : 0,
    budgetRange: budgetKind === 'range' ? answers.budgetChoice ?? null : null,
  };
};

export const completeGuidedSetup = async (draft: GuidedSetupDraft, guestEntryLimit: number | null, tableLimit: number | null) => {
  for (let step = 2; step <= 8; step += 1) {
    const errors = validateGuidedStep(step, draft.answers);
    if (errors.length) throw new Error(errors[0]);
  }
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user || auth.user.id !== draft.user_id) throw new Error('Your session has expired. Please sign in again.');
  const answers = normalizeGuidedAnswers(draft.answers);
  const creationPlan = getGuidedCreationPlan(answers);
  const { sections, requestedTables } = creationPlan;
  const venueFields = getGuidedVenueEventFields(answers);
  const usesDifferentLocations = answers.partsChoice === 'ceremony-reception' && answers.sameVenue === 'no';
  const receptionLocation = usesDifferentLocations ? answers.receptionVenue : answers.venueName;
  const receptionAddress = usesDifferentLocations ? answers.receptionAddress : venueFields.venueAddress;
  const ceremonyLocation = usesDifferentLocations ? answers.ceremonyVenue : answers.venueName;
  const ceremonyAddress = usesDifferentLocations ? answers.ceremonyAddress : venueFields.venueAddress;
  if (tableLimit !== null && requestedTables > tableLimit) throw new Error(`Your current plan supports ${tableLimit} starting tables. Reduce the table count or create them later.`);

  const { error: startError } = await supabase.from('onboarding_drafts').update({ creation_started_at: new Date().toISOString() }).eq('id', draft.id);
  if (startError) throwCreationFailure('draft-start', startError);
  let eventId = draft.created_event_id;
  if (!eventId) {
    const existing = await supabase.from('events').select('id').eq('onboarding_draft_id', draft.id).maybeSingle();
    if (existing.error) throwCreationFailure('event-recovery', existing.error);
    eventId = existing.data?.id ?? null;
  }
  if (!eventId) {
    const allowance = await getEventAllowanceSnapshot();
    if (!allowance.canCreate || allowance.atCap) throw new Error(getEventCreationBlockMessage(allowance));
    const now = new Date();
    const expiry = new Date(now); expiry.setFullYear(expiry.getFullYear() + 1);
    const eventType = answers.eventFormat === 'cocktail' ? 'cocktail' : 'seated';
    const { data, error } = await supabase.from('events').insert({
      user_id: auth.user.id,
      name: answers.eventName!.trim(),
      date: answers.dateChoice === 'exact' ? answers.exactDate || null : null,
      start_time: answers.dateChoice === 'exact' && !answers.timesUndecided ? answers.startTime || null : null,
      finish_time: answers.dateChoice === 'exact' && !answers.timesUndecided ? answers.finishTime || null : null,
      rsvp_deadline: answers.dateChoice === 'exact' && !answers.rsvpUndecided ? answers.rsvpDeadline || null : null,
      venue: sections.reception ? receptionLocation || null : null,
      venue_address: sections.reception ? receptionAddress || null : null,
      venue_phone: sections.reception ? venueFields.venuePhone : null,
      venue_contact: sections.reception ? venueFields.venueContact : null,
      venue_contact_email: sections.reception ? venueFields.venueContactEmail : null,
      ceremony_enabled: sections.ceremony,
      reception_enabled: sections.reception,
      ceremony_name: sections.ceremony ? `${answers.eventName} Ceremony` : null,
      ceremony_date: sections.ceremony && answers.dateChoice === 'exact' ? answers.exactDate || null : null,
      ceremony_venue: sections.ceremony ? ceremonyLocation || null : null,
      ceremony_venue_address: sections.ceremony ? ceremonyAddress || null : null,
      ceremony_venue_phone: sections.ceremony ? venueFields.venuePhone : null,
      ceremony_venue_contact: sections.ceremony ? venueFields.venueContact : null,
      ceremony_venue_contact_email: sections.ceremony ? venueFields.venueContactEmail : null,
      partner1_name: isCoupleCelebration(answers.celebrationType) ? [answers.customerFirstName, answers.customerSurname].filter(hasText).join(' ') : null,
      partner2_name: isCoupleCelebration(answers.celebrationType) ? [answers.partnerFirstName, answers.partnerSurname].filter(hasText).join(' ') : null,
      relation_mode: isCoupleCelebration(answers.celebrationType) ? 'two' : 'off',
      event_type: eventType,
      guest_limit: guestEntryLimit ?? Math.max(50, Number(answers.expectedAttending || 0)),
      created_date_local: now.toLocaleDateString('en-CA'),
      expiry_date_local: expiry.toLocaleDateString('en-CA'),
      event_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      onboarding_draft_id: draft.id,
      setup_details: answers as unknown as Json,
      event_image_path: answers.eventImagePath || null,
      event_image_fit: answers.eventImageFit === 'contain' ? 'contain' : 'cover',
      event_image_position_x: answers.eventImagePositionX ?? 50,
      event_image_position_y: answers.eventImagePositionY ?? 50,
      event_image_zoom: answers.eventImageZoom ?? 100,
      qr_apply_to_live_view: true,
    }).select('id').single();
    if (error || !data) {
      const recovered = await supabase.from('events').select('id').eq('onboarding_draft_id', draft.id).maybeSingle();
      if (recovered.error || !recovered.data) {
        const allowanceError = getDatabaseEventCreationError(error);
        if (allowanceError) throw allowanceError;
        throwCreationFailure('event-insert', error ?? recovered.error);
      }
      eventId = recovered.data.id;
    } else eventId = data.id;
    const { error: linkError } = await supabase.from('onboarding_drafts').update({ created_event_id: eventId }).eq('id', draft.id);
    if (linkError) throwCreationFailure('draft-link', linkError);
  }

  // Match manual event creation. QR provisioning is useful but deliberately non-blocking.
  try {
    const existingQr = await supabase.from('dynamic_qr_codes').select('id').eq('current_event_id', eventId).eq('destination_type', 'guest_lookup').limit(1).maybeSingle();
    if (!existingQr.error && !existingQr.data) {
      const generated = await supabase.rpc('generate_dynamic_qr_code');
      if (!generated.error && generated.data) await supabase.from('dynamic_qr_codes').insert({
        code: generated.data,
        user_id: auth.user.id,
        current_event_id: eventId,
        destination_type: 'guest_lookup',
        label: answers.eventName || 'Event QR',
        is_active: true,
      });
    }
  } catch (error) {
    console.error('Guided setup QR provisioning failed (non-blocking):', error);
  }

  const { error: budgetError } = await supabase.from('event_budget_settings').upsert({
    event_id: eventId,
    anticipated_budget: creationPlan.budgetAmount,
    currency: 'AUD',
    planned_budget_kind: creationPlan.budgetKind,
    planned_budget_range: creationPlan.budgetRange,
  }, { onConflict: 'event_id' });
  if (budgetError) throwCreationFailure('budget', budgetError);

  if (requestedTables > 0) {
    const { data: existingTables, error: existingError } = await supabase.from('tables').select('table_no, table_purpose').eq('event_id', eventId);
    if (existingError) throwCreationFailure('tables-read', existingError);
    const inserts: Array<Record<string, unknown>> = [];
    if (answers.headTable === 'yes' && !existingTables?.some((table) => table.table_purpose === 'head')) inserts.push({
      event_id: eventId, user_id: auth.user.id, name: 'Head Table', table_no: null, table_type: 'long', table_purpose: 'head',
      limit_seats: Number(answers.headTableCount), head_seating_order: defaultHeadSeatingOrder(answers.customerFirstName, answers.partnerFirstName),
    });
    const defaultShape = answers.tableStyle === 'mixed' ? 'round' : answers.tableStyle;
    for (let tableNo = 1; tableNo <= Number(answers.guestTableCount); tableNo += 1) {
      if (!existingTables?.some((table) => table.table_purpose === 'standard' && table.table_no === tableNo)) inserts.push({
        event_id: eventId, user_id: auth.user.id, name: String(tableNo), table_no: tableNo, table_type: defaultShape,
        table_purpose: 'standard', limit_seats: Number(answers.tableCapacity), head_seating_order: [],
      });
    }
    if (inserts.length) {
      const { error } = await supabase.from('tables').insert(inserts as never);
      if (error) throwCreationFailure('tables-insert', error);
    }
  }

  try {
    await reconcileGuidedSetupGuests(eventId, auth.user.id, answers);
  } catch (error) {
    throwCreationFailure(error instanceof GuidedSetupGuestError ? error.stage : 'guests-insert', error);
  }

  const completedAt = new Date().toISOString();
  const { error: completionError } = await supabase.from('onboarding_drafts').update({ created_event_id: eventId, current_step: 10, completed_at: completedAt }).eq('id', draft.id);
  if (completionError) throwCreationFailure('draft-completion', completionError);
  await supabase.from('profiles').update({ display_countdown_event_id: answers.dateChoice === 'exact' ? eventId : null }).eq('id', auth.user.id);
  setSelectedEventId(eventId);
  window.dispatchEvent(new CustomEvent('ww:selected-event-set', { detail: eventId }));
  return eventId;
};
