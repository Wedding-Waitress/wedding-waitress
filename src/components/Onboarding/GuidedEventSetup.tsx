import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, CalendarDays, Check, ChevronRight, ClipboardCheck, GlassWater,
  MapPin, PartyPopper, Sparkles, TableProperties, UsersRound,
} from 'lucide-react';
import { useAuthenticatedSession } from '@/contexts/AuthenticatedSessionContext';
import { useProfile } from '@/hooks/useProfile';
import { useUserPlan } from '@/hooks/useUserPlan';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import {
  beginGuidedSetup, BUDGET_LABELS, CELEBRATION_LABELS, completeGuidedSetup, GUIDED_SETUP_ROUTE,
  EVENT_FORMAT_LABELS, getGuidedEventImageHeading, getGuidedEventImageValue, getGuidedGuestSummary,
  getGuidedStepIssues, getGuidedTableSummary, getGuidedVenueAddress, PARTS_LABELS,
  type BudgetChoice, type CelebrationType, type GuidedSetupAnswers, type GuidedSetupDraft,
  type GuidedSetupMode, isCoupleCelebration, loadActiveGuidedSetup, parseBudgetAmount,
  normalizeGuidedAnswers, saveGuidedSetup, suggestedGuestTableCount, suggestEventName,
} from '@/lib/guidedEventSetup';
import { EventImageEditor, EventImagePreview } from '@/components/EventImage/EventImageEditor';
import type { EventImageValue } from '@/lib/eventImage';
import { GUIDED_SETUP_READY_VIDEO } from '@/config/guidedSetupMedia';
import { OnboardingAudio } from './OnboardingAudio';
import styles from './GuidedEventSetup.module.css';

const STEP_NAMES = ['Welcome', 'Celebration', 'Event details', 'Date & location', 'Event parts', 'Guests', 'Tables', 'Budget', 'Review', 'Ready'];
const EVENT_TYPES: Array<[CelebrationType, string]> = Object.entries(CELEBRATION_LABELS) as Array<[CelebrationType, string]>;
const BUDGET_OPTIONS = Object.entries(BUDGET_LABELS) as Array<[BudgetChoice, string]>;

const Choice = ({ selected, onClick, children, description }: { selected: boolean; onClick: () => void; children: React.ReactNode; description?: string }) => (
  <button type="button" role="radio" aria-checked={selected} className={styles.choice} data-selected={selected} onClick={onClick}>
    <span className={styles.choiceCheck}>{selected && <Check aria-hidden />}</span>
    <span><strong>{children}</strong>{description && <small>{description}</small>}</span>
  </button>
);

const visibleLabel = (label: React.ReactNode) => typeof label === 'string'
  ? label.replace(/\s*\((?:required|optional|editable)\)$/i, '')
  : label;

const ChoiceGroup = ({ label, field, error, children, required = true, hideLabel = false }: { label: string; field: string; error?: string; children: React.ReactNode; required?: boolean; hideLabel?: boolean }) => {
  const errorId = `guided-error-${field}`;
  return <div className={styles.choiceGroup} data-invalid={Boolean(error)} data-validation-field={field}>
    <p className={hideLabel ? styles.srOnly : styles.groupLabel}>{visibleLabel(label)}</p>
    <div role="radiogroup" aria-label={label} aria-required={required} aria-invalid={Boolean(error)} aria-describedby={error ? errorId : undefined} tabIndex={error ? -1 : undefined} className={styles.choiceGrid}>{children}</div>
    {error && <p id={errorId} className={styles.fieldError}>{error}</p>}
  </div>;
};

const Field = ({ label, field, children, hint, error, required = false }: { label: React.ReactNode; field: string; children: React.ReactElement; hint?: string; error?: string; required?: boolean }) => {
  const inputId = `guided-${field}`;
  const errorId = `guided-error-${field}`;
  const input = React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
    id: inputId,
    required,
    'aria-required': required || undefined,
    'aria-invalid': Boolean(error),
    'aria-describedby': error ? errorId : undefined,
  });
  return <label className={styles.field} data-invalid={Boolean(error)} data-validation-field={field} htmlFor={inputId}>
    <span>{visibleLabel(label)}</span>
    {input}
    {hint && !error && <small>{hint}</small>}
    {error && <small id={errorId} className={styles.fieldError}>{error}</small>}
  </label>;
};

const NumberField = ({ label, field, value, onChange, min = 0, error, required }: { label: string; field: string; value?: string; onChange: (value: string) => void; min?: number; error?: string; required?: boolean }) => (
  <Field label={label} field={field} error={error} required={required}><input type="number" inputMode="numeric" min={min} value={value || ''} onChange={(event) => onChange(event.target.value)} /></Field>
);

const formatDate = (value?: string) => value ? new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Australia/Sydney' }).format(new Date(`${value}T12:00:00+10:00`)) : 'Not decided yet';
const fullAddress = (answers: GuidedSetupAnswers) => getGuidedVenueAddress(answers);

const ROADMAP = [
  ['Guest List', 'Add guests, collect RSVPs, record dietary requirements and allocate tables.'],
  ['QR Code Seating Chart', 'Create a QR code guests can scan to find their table and seating information.'],
  ['Seating Chart Signs', 'Design professional seating-chart signs for the entrance.'],
  ['Invitations & Cards', 'Create invitations, Save the Date cards and Thank You cards.'],
  ['Name Place Cards', 'Create printable foldable cards with optional QR codes and messages.'],
  ['Individual Table Charts', 'Create a clear chart for each round, square or long table.'],
  ['Floor Plan', 'Plan ceremony and reception layouts, seating and important event areas.'],
  ['Dietary Requirements', 'Keep meal and dietary information organised for the venue and caterer.'],
  ['Full Seating Chart', 'Create one complete printable guest, table and seat chart.'],
  ['Live Slideshow', 'Provide guest-name and table lookup at the venue entrance.'],
  ['DJ & MC Questionnaire', 'Organise music, introductions, formalities and announcements.'],
  ['Run Sheet', 'Build the event timeline for venues, suppliers and entertainment.'],
  ['Photo & Video Sharing', 'Let guests upload photos and videos by QR code.'],
  ['Live Gallery & Slideshow', 'Display shared photos on a large screen as part of Photo & Video Sharing.'],
  ['Digital Photo Booth', 'Give guests a fun camera experience within Photo & Video Sharing.'],
  ['Digital Guestbooks', 'Collect written, photo and audio guestbook messages to treasure.'],
];

export const GuidedEventSetup = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { session } = useAuthenticatedSession();
  const { profile, loading: profileLoading } = useProfile();
  const { plan, loading: planLoading } = useUserPlan();
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const requestedMode: GuidedSetupMode = searchParams.get('mode') === 'additional' ? 'additional_event' : 'first_event';
  const shouldCreate = searchParams.get('new') === '1';
  const [draft, setDraft] = React.useState<GuidedSetupDraft | null>(null);
  const [answers, setAnswers] = React.useState<GuidedSetupAnswers>({});
  const [step, setStep] = React.useState(1);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [createdEventId, setCreatedEventId] = React.useState<string | null>(null);
  const [error, setError] = React.useState('');
  const [validationAttempted, setValidationAttempted] = React.useState(false);
  const headingRef = React.useRef<HTMLHeadingElement>(null);
  const autosaveTimerRef = React.useRef<number | null>(null);
  const saveQueueRef = React.useRef<Promise<GuidedSetupDraft | null>>(Promise.resolve(null));
  const loadedDraftRef = React.useRef(false);
  const creatingRef = React.useRef(false);

  const planAccessIssue = !isAdmin && (!plan
    ? 'We could not verify your Guest List allowance. Return to your account and try again.'
    : plan.is_read_only || plan.status === 'expired' || (plan.expires_at && new Date(plan.expires_at) < new Date())
      ? 'Your plan is not active for event creation. Review your subscription before continuing.'
      : '');
  const guestAllowanceLabel = isAdmin || plan?.guest_limit === null ? 'unlimited' : String(plan?.guest_limit ?? 'unavailable');

  const update = <K extends keyof GuidedSetupAnswers>(key: K, value: GuidedSetupAnswers[K]) => {
    setError('');
    setAnswers((current) => ({ ...current, [key]: value }));
  };
  const queueSave = React.useCallback((draftId: string, nextAnswers: GuidedSetupAnswers, nextStep: number) => {
    const normalized = normalizeGuidedAnswers(nextAnswers);
    const pending = saveQueueRef.current.catch(() => null).then(() => saveGuidedSetup(draftId, normalized, nextStep));
    saveQueueRef.current = pending;
    return pending;
  }, []);
  React.useEffect(() => { headingRef.current?.focus(); }, [step]);
  React.useEffect(() => {
    if (!draft) return;
    const urlStep = Number(searchParams.get('step'));
    if (Number.isInteger(urlStep) && urlStep >= 1 && urlStep <= 10 && urlStep !== step) setStep(urlStep);
  }, [draft, searchParams, step]);
  React.useEffect(() => {
    const active = document.activeElement as HTMLElement | null;
    if (!active || !['INPUT', 'SELECT', 'TEXTAREA'].includes(active.tagName)) return;
    window.setTimeout(() => active.scrollIntoView({ behavior: 'smooth', block: 'center' }), 180);
  }, [answers]);

  React.useEffect(() => {
    if (!session?.user.id || profileLoading) return;
    let active = true;
    void (async () => {
      try {
        const initial: GuidedSetupAnswers = {
          customerFirstName: profile?.first_name || '', customerSurname: profile?.last_name || '',
          organiserName: profile?.first_name || '', country: 'Australia',
        };
        const found = shouldCreate
          ? await beginGuidedSetup(session.user.id, requestedMode, initial)
          : await loadActiveGuidedSetup(session.user.id, requestedMode);
        if (!active) return;
        if (!found) { navigate('/dashboard', { replace: true }); return; }
        const restoredAnswers = normalizeGuidedAnswers({ ...initial, ...found.answers });
        setDraft(found); setAnswers(restoredAnswers);
        setStep(found.completed_at ? 10 : Math.max(1, Math.min(10, found.current_step)));
        setCreatedEventId(found.created_event_id);
        window.setTimeout(() => { loadedDraftRef.current = true; }, 0);
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : 'Your setup could not be loaded.');
      } finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [navigate, profile?.first_name, profile?.last_name, profileLoading, requestedMode, session?.user.id, shouldCreate]);

  React.useEffect(() => {
    if (!draft || !loadedDraftRef.current || draft.completed_at) return;
    if (autosaveTimerRef.current !== null) window.clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = window.setTimeout(() => {
      void queueSave(draft.id, answers, step).then((saved) => setDraft(saved)).catch((reason) => {
        setError(reason instanceof Error ? `Your latest answers could not be saved: ${reason.message}` : 'Your latest answers could not be saved.');
      });
    }, 650);
    return () => {
      if (autosaveTimerRef.current !== null) window.clearTimeout(autosaveTimerRef.current);
    };
  }, [answers, draft?.completed_at, draft?.id, queueSave, step]);

  const focusFirstInvalid = (field: string) => {
    window.requestAnimationFrame(() => {
      const container = document.querySelector<HTMLElement>(`[data-validation-field="${field}"]`);
      const target = container?.querySelector<HTMLElement>('input, select, textarea, [role="radiogroup"], button') ?? container;
      container?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      window.setTimeout(() => target?.focus({ preventScroll: true }), 180);
    });
  };

  const persistAndGo = async (nextStep: number) => {
    if (!draft) return;
    setError('');
    let nextAnswers = answers;
    if (step === 3 && !answers.eventName?.trim()) nextAnswers = { ...answers, eventName: suggestEventName(answers) };
    if (nextStep > step) {
      if (step === 6 && planAccessIssue) { setError(planAccessIssue); return; }
      setValidationAttempted(true);
      const issues = getGuidedStepIssues(step, nextAnswers);
      if (issues.length) { focusFirstInvalid(issues[0].field); return; }
    }
    setSaving(true);
    try {
      if (autosaveTimerRef.current !== null) window.clearTimeout(autosaveTimerRef.current);
      if (step === 2) {
        nextAnswers = { ...answers,
          customerFirstName: answers.customerFirstName || profile?.first_name || '', organiserName: answers.organiserName || profile?.first_name || '',
        };
      }
      if (step === 6 && ['seated', 'combined'].includes(answers.eventFormat || '')) {
        nextAnswers = { ...nextAnswers, tableCapacity: answers.tableCapacity || '8', headTable: answers.headTable || 'no', tableCreation: answers.tableCreation || 'automatic' };
        if (!nextAnswers.guestTableCount) nextAnswers.guestTableCount = String(suggestedGuestTableCount(nextAnswers));
      }
      nextAnswers = normalizeGuidedAnswers(nextAnswers);
      const saved = await queueSave(draft.id, nextAnswers, nextStep);
      setDraft(saved); setAnswers(nextAnswers); setStep(nextStep); setValidationAttempted(false);
      navigate(`${GUIDED_SETUP_ROUTE}?mode=${requestedMode === 'additional_event' ? 'additional' : 'first'}&step=${nextStep}`, { replace: false });
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Your answers could not be saved.'); }
    finally { setSaving(false); }
  };

  const createEvent = async () => {
    if (!draft || creatingRef.current) return;
    if (planAccessIssue) {
      setStep(6); setError(planAccessIssue);
      navigate(`${GUIDED_SETUP_ROUTE}?mode=${requestedMode === 'additional_event' ? 'additional' : 'first'}&step=6`);
      return;
    }
    creatingRef.current = true;
    for (let validationStep = 2; validationStep <= 8; validationStep += 1) {
      const issues = getGuidedStepIssues(validationStep, answers);
      if (issues.length) {
        setStep(validationStep); setValidationAttempted(true); setError('Please correct the highlighted information before creating your event.');
        navigate(`${GUIDED_SETUP_ROUTE}?mode=${requestedMode === 'additional_event' ? 'additional' : 'first'}&step=${validationStep}`);
        window.setTimeout(() => focusFirstInvalid(issues[0].field), 0);
        creatingRef.current = false;
        return;
      }
    }
    setCreating(true); setError('');
    try {
      if (autosaveTimerRef.current !== null) window.clearTimeout(autosaveTimerRef.current);
      const latest = await queueSave(draft.id, answers, 9);
      const eventId = await completeGuidedSetup(latest, plan?.guest_limit ?? null, plan?.table_limit ?? null);
      setDraft({ ...latest, created_event_id: eventId, completed_at: new Date().toISOString(), current_step: 10 });
      setCreatedEventId(eventId);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Your event could not be created. Your answers are safe—please try again.'); }
    finally { creatingRef.current = false; setCreating(false); }
  };

  const saveEventImage = async (value: EventImageValue | null) => {
    if (!draft) return;
    const nextAnswers: GuidedSetupAnswers = {
      ...answers,
      eventImagePath: value?.path,
      eventImageFit: value?.fit,
      eventImagePositionX: value?.positionX,
      eventImagePositionY: value?.positionY,
      eventImageZoom: value?.zoom,
    };
    setAnswers(nextAnswers);
    const saved = await queueSave(draft.id, nextAnswers, step);
    setDraft(saved);
  };

  if (loading || profileLoading || planLoading || adminLoading) return <main className={styles.loading} aria-live="polite"><Sparkles aria-hidden /><p>Preparing your guided event setup…</p></main>;
  if (!draft) return <main className={styles.loading} role="alert"><p>{error || 'No active setup was found.'}</p><button onClick={() => navigate('/dashboard')}>Return to Dashboard</button></main>;

  const title = ['Welcome to Wedding Waitress', 'What are you celebrating?', 'Tell us about your event', 'When and where is it happening?',
    answers.celebrationType === 'wedding' ? 'What parts of the celebration are you planning?' : 'How is your celebration being held?',
    'Tell us about your guests', 'Let’s set up your tables', 'What is your planned event budget?', 'Review your event setup', `Well done, ${profile?.first_name || answers.customerFirstName || 'there'}!`][step - 1];
  const validationAnswers = step === 3 && !answers.eventName?.trim() ? { ...answers, eventName: suggestEventName(answers) } : answers;
  const validationIssues = validationAttempted ? getGuidedStepIssues(step, validationAnswers) : [];
  const fieldErrors = Object.fromEntries(validationIssues.map((issue) => [issue.field, issue.message]));
  const nextDisabled = saving || creating;

  const renderStep = () => {
    if (step === 1) return <div className={styles.heroStep}><img src="/wedding-waitress-logo-full.png" alt="Wedding Waitress" /><p>Let’s make planning your celebration simple. We’ll start with the easy details and prepare your workspace for you{profile?.first_name ? `, ${profile.first_name}` : ''}.</p></div>;
    if (step === 2) return <><p className={styles.intro}>Choose the one option that best describes your event.</p><ChoiceGroup label="Event type" field="celebrationType" error={fieldErrors.celebrationType}>{EVENT_TYPES.map(([value, label]) => <Choice key={value} selected={answers.celebrationType === value} onClick={() => { update('celebrationType', value); if (value !== 'other') update('otherEventType', ''); }}>{label}</Choice>)}</ChoiceGroup>{answers.celebrationType === 'other' && <Field label="Please tell us what type of event you’re planning" field="otherEventType" error={fieldErrors.otherEventType} required><input value={answers.otherEventType || ''} onChange={(event) => update('otherEventType', event.target.value)} required /></Field>}</>;
    if (step === 3) {
      const couple = isCoupleCelebration(answers.celebrationType);
      return <div className={styles.formGrid}>
        {couple && <><Field label="Your first name" field="customerFirstName" error={fieldErrors.customerFirstName} required><input value={answers.customerFirstName || ''} onChange={(e) => update('customerFirstName', e.target.value)} /></Field><Field label="Your surname" field="customerSurname"><input value={answers.customerSurname || ''} onChange={(e) => update('customerSurname', e.target.value)} /></Field><Field label="Your partner’s first name" field="partnerFirstName" error={fieldErrors.partnerFirstName} required><input value={answers.partnerFirstName || ''} onChange={(e) => update('partnerFirstName', e.target.value)} /></Field><Field label="Your partner’s surname" field="partnerSurname"><input value={answers.partnerSurname || ''} onChange={(e) => update('partnerSurname', e.target.value)} /></Field></>}
        {answers.celebrationType === 'birthday' && <><Field label="Name of the person celebrating" field="honoureeName" error={fieldErrors.honoureeName} required><input value={answers.honoureeName || ''} onChange={(e) => update('honoureeName', e.target.value)} /></Field><NumberField label="Age" field="age" value={answers.age} onChange={(v) => update('age', v)} min={1} /></>}
        {!couple && answers.celebrationType !== 'birthday' && <><Field label="Organiser’s name" field="organiserName" error={fieldErrors.organiserName} required><input value={answers.organiserName || ''} onChange={(e) => update('organiserName', e.target.value)} /></Field>{['corporate', 'school', 'christmas'].includes(answers.celebrationType || '') && <Field label={answers.celebrationType === 'school' ? 'School name' : 'Company or organisation name'} field="organisationName"><input value={answers.organisationName || ''} onChange={(e) => update('organisationName', e.target.value)} /></Field>}</>}
        <Field label="Event name" field="eventName" hint="You can edit this suggestion." error={fieldErrors.eventName} required><input value={answers.eventName || suggestEventName(answers)} onFocus={() => { if (!answers.eventName) update('eventName', suggestEventName(answers)); }} onChange={(e) => update('eventName', e.target.value)} /></Field>
        <EventImageEditor
          heading={getGuidedEventImageHeading(answers.celebrationType)}
          context={{ kind: 'draft', ownerId: draft.user_id, draftId: draft.id }}
          value={getGuidedEventImageValue(answers)}
          onChange={saveEventImage}
        />
      </div>;
    }
    if (step === 4) return <div className={styles.sections}>
      <section><h3><CalendarDays aria-hidden />Date</h3><ChoiceGroup label="Date certainty" field="dateChoice" error={fieldErrors.dateChoice}><Choice selected={answers.dateChoice === 'exact'} onClick={() => update('dateChoice', 'exact')}>We have selected an exact date</Choice><Choice selected={answers.dateChoice === 'month'} onClick={() => update('dateChoice', 'month')}>We know the month and year</Choice><Choice selected={answers.dateChoice === 'undecided'} onClick={() => update('dateChoice', 'undecided')}>We haven’t decided yet</Choice></ChoiceGroup>
      {answers.dateChoice === 'exact' && <div className={styles.formGrid}><Field label="Event date" field="exactDate" error={fieldErrors.exactDate} required><input type="date" value={answers.exactDate || ''} onChange={(e) => update('exactDate', e.target.value)} /></Field><label className={styles.check} data-validation-field="timesUndecided"><input type="checkbox" checked={answers.timesUndecided || false} onChange={(e) => update('timesUndecided', e.target.checked)} />Start and finish times not decided yet</label>{!answers.timesUndecided && <><Field label="Start time" field="startTime" error={fieldErrors.startTime} required><input type="time" value={answers.startTime || ''} onChange={(e) => update('startTime', e.target.value)} /></Field><Field label="Finish time" field="finishTime" error={fieldErrors.finishTime} required><input type="time" value={answers.finishTime || ''} onChange={(e) => update('finishTime', e.target.value)} /></Field></>}<label className={styles.check} data-validation-field="rsvpUndecided"><input type="checkbox" checked={answers.rsvpUndecided || false} onChange={(e) => update('rsvpUndecided', e.target.checked)} />RSVP deadline not decided yet</label>{!answers.rsvpUndecided && <Field label="RSVP deadline" field="rsvpDeadline" error={fieldErrors.rsvpDeadline} required><input type="date" value={answers.rsvpDeadline || ''} max={answers.exactDate} onChange={(e) => update('rsvpDeadline', e.target.value)} /></Field>}</div>}
      {answers.dateChoice === 'month' && <div className={styles.formGrid}><Field label="Month" field="month" error={fieldErrors.month} required><select value={answers.month || ''} onChange={(e) => update('month', e.target.value)}><option value="">Choose month</option>{Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={String(i + 1)}>{new Intl.DateTimeFormat('en-AU', { month: 'long' }).format(new Date(2026, i, 1))}</option>)}</select></Field><NumberField label="Year" field="year" value={answers.year} onChange={(v) => update('year', v)} min={new Date().getFullYear()} error={fieldErrors.year} required /></div>}</section>
      <section><h3><MapPin aria-hidden />Location</h3><ChoiceGroup label="Venue status" field="locationChoice" error={fieldErrors.locationChoice}><Choice selected={answers.locationChoice === 'booked'} onClick={() => update('locationChoice', 'booked')}>We have booked a venue</Choice><Choice selected={answers.locationChoice === 'in-mind'} onClick={() => update('locationChoice', 'in-mind')}>We have a venue or location in mind</Choice><Choice selected={answers.locationChoice === 'undecided'} onClick={() => update('locationChoice', 'undecided')}>We haven’t decided yet</Choice></ChoiceGroup>{answers.locationChoice !== 'undecided' && answers.locationChoice && <div className={styles.formGrid}><Field label="Venue name" field="venueName" error={fieldErrors.venueName} required={answers.locationChoice === 'booked'}><input value={answers.venueName || ''} onChange={(e) => update('venueName', e.target.value)} /></Field><Field label="Venue address" field="venueAddress"><input autoComplete="street-address" value={answers.venueAddress || ''} onChange={(e) => update('venueAddress', e.target.value)} /></Field><Field label="Suburb" field="suburb"><input autoComplete="address-level2" value={answers.suburb || ''} onChange={(e) => update('suburb', e.target.value)} /></Field><Field label="State" field="state"><input autoComplete="address-level1" value={answers.state || ''} onChange={(e) => update('state', e.target.value)} /></Field><Field label="Postcode" field="postcode" error={fieldErrors.postcode}><input autoComplete="postal-code" value={answers.postcode || ''} onChange={(e) => update('postcode', e.target.value)} /></Field><Field label="Country" field="country"><input autoComplete="country-name" value={answers.country || ''} onChange={(e) => update('country', e.target.value)} /></Field><Field label="Venue contact person" field="venueContactName"><input autoComplete="name" value={answers.venueContactName || ''} onChange={(e) => update('venueContactName', e.target.value)} /></Field><Field label="Venue telephone or mobile" field="venuePhone" error={fieldErrors.venuePhone}><input type="tel" autoComplete="tel" value={answers.venuePhone || ''} onChange={(e) => update('venuePhone', e.target.value)} /></Field><Field label="Venue contact email" field="venueContactEmail" error={fieldErrors.venueContactEmail}><input type="email" autoComplete="email" value={answers.venueContactEmail || ''} onChange={(e) => update('venueContactEmail', e.target.value)} /></Field></div>}</section>
    </div>;
    if (step === 5) {
      const wedding = answers.celebrationType === 'wedding';
      const options: Array<[GuidedSetupAnswers['partsChoice'], string]> = wedding ? [['ceremony-reception', 'Ceremony and reception'], ['ceremony-only', 'Ceremony only'], ['reception-only', 'Reception only'], ['undecided', 'We haven’t decided yet']] : [['one-location', 'One event in one location'], ['multiple', 'More than one part or location'], ['undecided', 'We haven’t decided yet']];
      return <><ChoiceGroup label="Celebration" field="partsChoice" error={fieldErrors.partsChoice} hideLabel>{options.map(([value, label]) => <Choice key={value} selected={answers.partsChoice === value} onClick={() => update('partsChoice', value)}>{label}</Choice>)}</ChoiceGroup>{answers.partsChoice === 'ceremony-reception' && <><h3>Are your ceremony and reception at the same location?</h3><ChoiceGroup label="Ceremony and reception locations" field="sameVenue" error={fieldErrors.sameVenue} hideLabel><Choice selected={answers.sameVenue === 'yes'} onClick={() => update('sameVenue', 'yes')}>Yes — Same location</Choice><Choice selected={answers.sameVenue === 'no'} onClick={() => update('sameVenue', 'no')}>No — Different locations</Choice><Choice selected={answers.sameVenue === 'undecided'} onClick={() => update('sameVenue', 'undecided')}>We haven’t decided yet</Choice></ChoiceGroup>{answers.sameVenue === 'no' && <div className={styles.formGrid}><Field label="Ceremony location name" field="ceremonyVenue" error={fieldErrors.ceremonyVenue} required><input value={answers.ceremonyVenue || ''} onChange={(e) => update('ceremonyVenue', e.target.value)} /></Field><Field label="Ceremony address" field="ceremonyAddress" error={fieldErrors.ceremonyAddress} required><input value={answers.ceremonyAddress || ''} onChange={(e) => update('ceremonyAddress', e.target.value)} /></Field><Field label="Reception location name" field="receptionVenue" error={fieldErrors.receptionVenue} required><input value={answers.receptionVenue || ''} onChange={(e) => update('receptionVenue', e.target.value)} /></Field><Field label="Reception address" field="receptionAddress" error={fieldErrors.receptionAddress} required><input value={answers.receptionAddress || ''} onChange={(e) => update('receptionAddress', e.target.value)} /></Field></div>}</>}{!wedding && answers.partsChoice === 'multiple' && <div className={styles.formGrid}><Field label="Main venue or first location" field="ceremonyVenue"><input value={answers.ceremonyVenue || ''} onChange={(e) => update('ceremonyVenue', e.target.value)} /></Field><Field label="Main venue or first address" field="ceremonyAddress"><input value={answers.ceremonyAddress || ''} onChange={(e) => update('ceremonyAddress', e.target.value)} /></Field><Field label="Second venue or location" field="receptionVenue"><input value={answers.receptionVenue || ''} onChange={(e) => update('receptionVenue', e.target.value)} /></Field><Field label="Second address" field="receptionAddress"><input value={answers.receptionAddress || ''} onChange={(e) => update('receptionAddress', e.target.value)} /></Field></div>}</>;
    }
    if (step === 6) return <><h3>How will your guests be celebrating?</h3><ChoiceGroup label="Guest format" field="eventFormat" error={fieldErrors.eventFormat}><Choice selected={answers.eventFormat === 'seated'} onClick={() => update('eventFormat', 'seated')}>Sit-down event with tables</Choice><Choice selected={answers.eventFormat === 'cocktail'} onClick={() => update('eventFormat', 'cocktail')}>Stand-up cocktail event without allocated tables</Choice><Choice selected={answers.eventFormat === 'combined'} onClick={() => update('eventFormat', 'combined')}>A combination of seated and cocktail</Choice><Choice selected={answers.eventFormat === 'undecided'} onClick={() => update('eventFormat', 'undecided')}>We haven’t decided yet</Choice></ChoiceGroup><div className={styles.formGrid}><NumberField label="Approximate number invited" field="approximateInvited" value={answers.approximateInvited} onChange={(v) => update('approximateInvited', v)} error={fieldErrors.approximateInvited} required={!answers.guestCountsUnsure} /><NumberField label="Expected number attending" field="expectedAttending" value={answers.expectedAttending} onChange={(v) => update('expectedAttending', v)} error={fieldErrors.expectedAttending} required={!answers.guestCountsUnsure} /><NumberField label="Adults, if known" field="adults" value={answers.adults} onChange={(v) => update('adults', v)} error={fieldErrors.adults} /><NumberField label="Children, if known" field="children" value={answers.children} onChange={(v) => update('children', v)} error={fieldErrors.children} /><NumberField label="Vendors or event staff requiring seats" field="vendors" value={answers.vendors} onChange={(v) => update('vendors', v)} error={fieldErrors.vendors} /></div><label className={styles.check}><input type="checkbox" checked={answers.guestCountsUnsure || false} onChange={(e) => update('guestCountsUnsure', e.target.checked)} />We’re not sure enough to estimate guest numbers yet</label><div className={styles.notice}><UsersRound aria-hidden /><p>Your event estimate is separate from actual Guest List records. Your estimate will remain <strong>{answers.guestCountsUnsure ? 'not decided' : answers.expectedAttending || 0}</strong>; your account permits <strong>{guestAllowanceLabel}</strong> actual guest records. No guest records will be invented.</p>{planAccessIssue && <button type="button" onClick={() => navigate('/account/plan-billing')}>Review account</button>}</div></>;
    if (step === 7) {
      if (answers.eventFormat === 'cocktail') return <div className={styles.notice}><GlassWater aria-hidden /><p>No allocated guest tables will be created for this stand-up cocktail event. Go Back if that choice is incorrect.</p></div>;
      if (answers.eventFormat === 'undecided') return <div className={styles.notice}><TableProperties aria-hidden /><p>Your undecided table status is recorded. You can prepare tables later from the Tables page.</p></div>;
      return <><ChoiceGroup label="Table creation" field="tableCreation" error={fieldErrors.tableCreation}><Choice selected={answers.tableCreation === 'automatic'} onClick={() => update('tableCreation', 'automatic')}>Automatically create my starting tables</Choice><Choice selected={answers.tableCreation === 'later'} onClick={() => update('tableCreation', 'later')}>I’ll create my tables later</Choice></ChoiceGroup>{answers.tableCreation === 'automatic' && <><ChoiceGroup label="Preferred table style" field="tableStyle" error={fieldErrors.tableStyle}>{(['round', 'square', 'long', 'mixed'] as const).map((shape) => <Choice key={shape} selected={answers.tableStyle === shape} onClick={() => update('tableStyle', shape)}>{shape[0].toUpperCase() + shape.slice(1)}</Choice>)}</ChoiceGroup><div className={styles.formGrid}><NumberField label="Typical guests per table" field="tableCapacity" value={answers.tableCapacity} onChange={(v) => { update('tableCapacity', v); window.setTimeout(() => update('guestTableCount', String(suggestedGuestTableCount({ ...answers, tableCapacity: v }))), 0); }} min={1} error={fieldErrors.tableCapacity} required /><Field label="Will you have a Head Table?" field="headTable" error={fieldErrors.headTable} required><select value={answers.headTable || ''} onChange={(e) => update('headTable', e.target.value as 'yes' | 'no')}><option value="">Choose</option><option value="yes">Yes</option><option value="no">No</option></select></Field>{answers.headTable === 'yes' && <NumberField label="People at the Head Table" field="headTableCount" value={answers.headTableCount} onChange={(v) => { update('headTableCount', v); window.setTimeout(() => update('guestTableCount', String(suggestedGuestTableCount({ ...answers, headTableCount: v }))), 0); }} min={1} error={fieldErrors.headTableCount} required />}<NumberField label="Number of guest tables to create" field="guestTableCount" value={answers.guestTableCount} onChange={(v) => update('guestTableCount', v)} error={fieldErrors.guestTableCount} required /></div><div className={styles.calculation}>Based on {Number(answers.expectedAttending || 0)} expected guests, {answers.headTable === 'yes' ? Number(answers.headTableCount || 0) : 0} people at the Head Table and {Number(answers.tableCapacity || 0)} guests per table, we suggest creating <strong>{suggestedGuestTableCount(answers)} guest tables</strong>.</div>{answers.tableStyle === 'mixed' && <p className={styles.intro}>Starting guest tables will use Round as the supported default. You can mix individual shapes later in Tables.</p>}</>}</>;
    }
    if (step === 8) return <><p className={styles.intro}>This is your overall planned budget. You can change it later; no expenses or category allocations will be invented.</p><ChoiceGroup label="Overall planned budget" field="budgetChoice" error={fieldErrors.budgetChoice}>{BUDGET_OPTIONS.map(([value, label]) => <Choice key={value} selected={answers.budgetChoice === value} onClick={() => update('budgetChoice', value)}>{label}</Choice>)}</ChoiceGroup>{answers.budgetChoice === 'exact' && <Field label="Exact amount (AUD)" field="budgetExact" error={fieldErrors.budgetExact} required><input className={styles.currencyInput} inputMode="decimal" value={answers.budgetExact || ''} onChange={(e) => update('budgetExact', e.target.value)} /></Field>}</>;
    if (step === 9) {
      const rows: Array<[string, React.ReactNode, number]> = [
        ['Event', `${answers.celebrationType ? CELEBRATION_LABELS[answers.celebrationType] : ''} · ${answers.eventName}`, 2],
        ['Photo or logo', getGuidedEventImageValue(answers) ? <EventImagePreview value={getGuidedEventImageValue(answers)!} /> : 'Not added', 3],
        ['People', isCoupleCelebration(answers.celebrationType) ? `${answers.customerFirstName} & ${answers.partnerFirstName}` : answers.honoureeName || answers.organiserName, 3],
        ['Date & time', answers.dateChoice === 'exact' ? `${formatDate(answers.exactDate)}${answers.timesUndecided ? '' : ` · ${answers.startTime}–${answers.finishTime}`}` : answers.dateChoice === 'month' ? `${answers.month}/${answers.year}` : 'Not decided yet', 4],
        ['Location', answers.locationChoice === 'undecided' ? 'Not decided yet' : <>{answers.venueName || 'Location in mind'}{fullAddress(answers) ? ` · ${fullAddress(answers)}` : ''}{answers.venueContactName && <><br />Contact: {answers.venueContactName}</>}{answers.venuePhone && <> · {answers.venuePhone}</>}{answers.venueContactEmail && <><br />{answers.venueContactEmail}</>}</>, 4],
        ['Celebration and locations', <>{answers.partsChoice ? PARTS_LABELS[answers.partsChoice] : 'Not decided yet'}{answers.partsChoice === 'ceremony-reception' && answers.sameVenue && <> · {answers.sameVenue === 'yes' ? 'Same location' : answers.sameVenue === 'no' ? 'Different locations' : 'We haven’t decided yet'}</>}{answers.partsChoice === 'ceremony-reception' && answers.sameVenue === 'no' && <><br />Ceremony: {answers.ceremonyVenue} · {answers.ceremonyAddress}<br />Reception: {answers.receptionVenue} · {answers.receptionAddress}</>}</>, 5],
        ['Guests', <>{answers.eventFormat ? EVENT_FORMAT_LABELS[answers.eventFormat] : 'Not decided yet'}<br />{getGuidedGuestSummary(answers)}</>, 6],
        ['Tables', getGuidedTableSummary(answers), 7],
        ['Budget', answers.budgetChoice === 'exact' ? `A$${parseBudgetAmount(answers.budgetExact)?.toLocaleString('en-AU')}` : BUDGET_LABELS[answers.budgetChoice!], 8],
      ];
      return <><div className={styles.review}>{rows.map(([label, value, target]) => <section key={label}><div><h3>{label}</h3><p>{value}</p></div><button type="button" onClick={() => void persistAndGo(target)} aria-label={`Edit ${label}`}>Edit</button></section>)}</div>{createdEventId && <div className={styles.success} role="status"><PartyPopper aria-hidden /><div><h3>Your event is ready</h3><p>We created the event, saved the budget choice and prepared the requested starting tables.</p></div></div>}</>;
    }
    return <div className={styles.ready}><div className={styles.sparkles} aria-hidden><Sparkles /><PartyPopper /><Sparkles /></div><p className={styles.kicker}>Your Wedding Waitress is ready</p><p>Your event workspace has been prepared from the information you provided. Everything remains editable, and we’re excited to help make planning simpler.</p><section><h3>Already prepared for you</h3><ul><li>Your event in My Events</li><li>Your overall planned budget status</li><li>{answers.tableCreation === 'automatic' ? 'Your requested starting tables' : 'Tables ready for you to add later'}</li><li>Guest List ready for real guest records</li><li>Ceremony and reception availability for Floor Plan</li></ul></section>{GUIDED_SETUP_READY_VIDEO && <video className={styles.video} controls preload="metadata" src={GUIDED_SETUP_READY_VIDEO} />}<h3>Here’s what Wedding Waitress can help you do next</h3><div className={styles.roadmap}>{ROADMAP.map(([name, description]) => <article key={name}><Check aria-hidden /><div><h4>{name}</h4><p>{description}</p></div></article>)}</div><p>Wedding Waitress is here to keep everything organised and help you enjoy your celebration. Let’s start planning!</p></div>;
  };

  return <main className={styles.page}>
    <header className={styles.topbar}><img src="/wedding-waitress-logo-full.png" alt="Wedding Waitress" /><span>Guided Event Setup</span></header>
    <nav className={styles.progress} aria-label={`Guided Event Setup progress. Step ${step} of 10.`}><ol>{STEP_NAMES.map((name, index) => <li key={name} data-current={step === index + 1} data-complete={step > index + 1}><span>{step > index + 1 ? <Check aria-hidden /> : index + 1}</span><small>{name}</small></li>)}</ol></nav>
    <div className={styles.shell}><section className={styles.card} data-step={step} aria-labelledby="guided-setup-heading"><p className={styles.stepLabel}>Step {step} of 10</p><h1 id="guided-setup-heading" ref={headingRef} tabIndex={-1}>{title}</h1>{step === 1 && <h2>Your Wedding &amp; Event Assistant</h2>}<OnboardingAudio step={step} /><div className={styles.content}>{renderStep()}</div>
      {validationIssues.length > 1 && <div className={styles.validationSummary} role="alert" aria-live="assertive"><strong>Please correct {validationIssues.length} items:</strong><ul>{validationIssues.map((issue) => <li key={`${issue.field}-${issue.message}`}>{issue.label}: {issue.message}</li>)}</ul></div>}
      {validationIssues.length === 1 && <p className={styles.srOnly} role="alert" aria-live="assertive">{validationIssues[0].message}</p>}
      {error && <p className={styles.error} role="alert">{error}</p>}
      <footer className={styles.actions}>{step > 1 && step < 10 && <button type="button" className={styles.back} disabled={saving || creating} onClick={() => void persistAndGo(step - 1)}><ArrowLeft aria-hidden />Back</button>}
        {step < 9 && <button type="button" className={styles.primary} disabled={nextDisabled} onClick={() => void persistAndGo(step + 1)}>{saving ? 'Saving…' : 'Next'}<ChevronRight aria-hidden /></button>}
        {step === 9 && !createdEventId && <button type="button" className={styles.primary} disabled={creating} onClick={() => void createEvent()}><ClipboardCheck aria-hidden />{creating ? 'Creating Your Event…' : 'Create My Event'}</button>}
        {step === 9 && createdEventId && <button type="button" className={styles.primary} onClick={() => void persistAndGo(10)}>Next<ChevronRight aria-hidden /></button>}
        {step === 10 && <button type="button" className={styles.primary} onClick={() => navigate('/dashboard?tab=guest-list', { replace: true })}><ChevronRight aria-hidden />Enter Wedding Waitress</button>}
      </footer>
    </section></div>
  </main>;
};
