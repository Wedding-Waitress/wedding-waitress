import React from 'react';
import { AlertCircle, CalendarDays, Check, ChevronRight, CircleCheck, Clock3, QrCode, TableProperties, UserRoundCheck, UsersRound, Utensils } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Event } from '@/hooks/useEvents';
import { useDashboardOverview } from '@/hooks/useDashboardOverview';
import { EventBudgetPlanner } from './EventBudgetPlanner/EventBudgetPlanner';
import styles from './DashboardOverview.module.css';

type DashboardEvent = Pick<Event, 'id' | 'name'> & Partial<Pick<Event,
  'date' | 'venue' | 'start_time' | 'ceremony_enabled' | 'ceremony_name' |
  'ceremony_date' | 'ceremony_venue' | 'ceremony_start_time' | 'reception_enabled'
>>;

interface DashboardOverviewProps {
  onNavigateToTab: (tabId: string, eventId?: string) => void;
  selectedEventId: string | null;
  onEventSelect: (eventId: string) => void;
  events: DashboardEvent[];
  eventsLoading?: boolean;
}

interface AttentionItem { text: string; tabId: string }

const MANROPE_FONT = "'Manrope', ui-sans-serif, system-ui, sans-serif";

const formatDate = (value: string | null | undefined): string => {
  if (!value) return 'Date to be confirmed';
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return 'Date to be confirmed';
  return new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
};

const formatTime = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const [hours, minutes] = value.split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return new Intl.DateTimeFormat('en-AU', { hour: 'numeric', minute: '2-digit' }).format(new Date(2000, 0, 1, hours, minutes));
};

const getCountdown = (value: string | null | undefined): string => {
  if (!value) return 'Add a date to see your countdown';
  const eventDate = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(eventDate.getTime())) return 'Add a date to see your countdown';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((eventDate.getTime() - today.getTime()) / 86_400_000);
  if (days === 0) return 'Today is the day';
  if (days === 1) return '1 day to go';
  if (days > 1) return `${days} days to go`;
  if (days === -1) return '1 day ago';
  return `${Math.abs(days)} days ago`;
};

const plural = (count: number, singular: string, pluralForm = `${singular}s`): string => `${count} ${count === 1 ? singular : pluralForm}`;

const DashboardAction: React.FC<{ children: React.ReactNode; onClick: () => void; ariaLabel?: string }> = ({ children, onClick, ariaLabel }) => (
  <button type="button" className={styles.cardAction} onClick={onClick} aria-label={ariaLabel}>
    <span>{children}</span><ChevronRight size={14} strokeWidth={1.8} aria-hidden="true" />
  </button>
);

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  onNavigateToTab,
  selectedEventId,
  onEventSelect,
  events,
  eventsLoading = false,
}) => {
  const selectedEvent = events.find((event) => event.id === selectedEventId) ?? null;
  const { data, loading, secondaryLoading, error } = useDashboardOverview(selectedEvent?.id ?? null);
  const openPage = (tabId: string) => onNavigateToTab(tabId, selectedEvent?.id);

  const attentionItems = React.useMemo<AttentionItem[]>(() => {
    if (!selectedEvent || !data) return [];
    const items: AttentionItem[] = [];
    if (data.unseatedAttendingGuests > 0) items.push({ text: `${plural(data.unseatedAttendingGuests, 'confirmed guest')} still ${data.unseatedAttendingGuests === 1 ? 'needs' : 'need'} a table`, tabId: 'table-list' });
    if (data.pendingGuests > 0) items.push({ text: `${plural(data.pendingGuests, 'guest')} still ${data.pendingGuests === 1 ? 'has' : 'have'} not responded`, tabId: 'guest-list' });
    if (data.overCapacityTables > 0) items.push({ text: `${plural(data.overCapacityTables, 'table')} ${data.overCapacityTables === 1 ? 'is' : 'are'} over saved capacity`, tabId: 'table-list' });
    if (!selectedEvent.date || !selectedEvent.venue) {
      const missing = [!selectedEvent.date ? 'date' : '', !selectedEvent.venue ? 'reception venue' : ''].filter(Boolean).join(' and ');
      items.push({ text: `Add the event ${missing}`, tabId: 'my-events' });
    }
    if (data.qrReady === false) items.push({ text: 'Finish setting up the event QR code', tabId: 'qr-code' });
    return items.slice(0, 4);
  }, [data, selectedEvent]);

  const setupSteps = data ? [
    { label: 'Event Created', complete: true, pending: false, tabId: 'my-events' },
    { label: 'Guests Added', complete: data.totalGuests > 0, pending: false, tabId: 'guest-list' },
    { label: 'Tables Assigned', complete: data.attendingGuests > 0 && data.unseatedAttendingGuests === 0 && data.tableCount > 0, pending: false, tabId: 'table-list' },
    { label: 'QR Code Ready', complete: data.qrReady === true, pending: data.qrReady === null, tabId: 'qr-code' },
  ] : [];
  const completedSteps = setupSteps.filter((step) => step.complete).length;
  const seatingProgress = data && data.attendingGuests > 0 ? Math.round((data.seatedAttendingGuests / data.attendingGuests) * 100) : 0;
  const primaryAttention = attentionItems[0] ?? { text: '', tabId: 'my-events' };
  const attentionActionLabels: Record<string, string> = {
    'table-list': 'View Tables',
    'guest-list': 'View Guest List',
    'my-events': 'View Event Details',
    'qr-code': 'View QR Code',
  };
  const firstIncompleteSetupTab = !selectedEvent?.date || !selectedEvent?.venue
    ? 'my-events'
    : !setupSteps[1]?.complete
      ? 'guest-list'
      : !setupSteps[2]?.complete
        ? 'table-list'
        : 'qr-code';
  const setupComplete = setupSteps.length > 0 && setupSteps.every((step) => step.complete);

  return (
    <div className={`w-full max-w-none ${styles.overview}`} style={{ fontFamily: MANROPE_FONT }}>
      <header className={styles.pageHeader}>
        <h1 className={styles.heading}>Event Budget Planner</h1>
        <p>View your event at a glance and plan, track and manage your event budget.</p>
      </header>

      <Card className={styles.eventPanel}>
        <label id="dashboard-event-selector-label" className={styles.eventLabel}>
          <CalendarDays size={18} strokeWidth={1.8} aria-hidden="true" /><span>Choose Event<span aria-hidden>:</span></span>
        </label>
        <Select value={selectedEventId ?? ''} onValueChange={onEventSelect} disabled={eventsLoading || events.length === 0}>
          <SelectTrigger aria-labelledby="dashboard-event-selector-label" className={`h-11 text-sm font-medium ${styles.eventField}`}>
            <span className="!flex flex-1 min-w-0 items-center gap-2 overflow-hidden text-left [&>span]:truncate" data-testid="dashboard-event-value">
              <CalendarDays size={17} strokeWidth={1.8} className={`shrink-0 ${styles.eventFieldIcon}`} aria-hidden="true" />
              <SelectValue className={styles.eventValueText} placeholder={eventsLoading ? 'Loading events…' : events.length === 0 ? 'No events created' : 'Select an event'} />
            </span>
          </SelectTrigger>
          <SelectContent className={styles.eventMenu}>
            {events.map((event) => <SelectItem key={event.id} value={event.id} className={styles.eventOption}>{event.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </Card>

      <section className={styles.overviewPanel} aria-labelledby="dashboard-overview-heading">
        <div className={styles.introduction}>
          <h2 id="dashboard-overview-heading">Your Event at a Glance</h2>
          <p>A simple overview of your wedding progress. Select any section to view or update its details.</p>
        </div>

      {!eventsLoading && events.length === 0 && <Card className={styles.emptyState}>
        <CalendarDays size={28} strokeWidth={1.6} aria-hidden="true" /><h2>Create your first event</h2>
        <p>Start with your wedding details, then return here to follow your progress.</p>
        <DashboardAction onClick={() => onNavigateToTab('my-events')}>Create Your First Event</DashboardAction>
      </Card>}

      {events.length > 0 && !selectedEvent && <Card className={`${styles.emptyState} ${styles.selectionEmptyState}`}>
        <CalendarDays size={28} strokeWidth={1.6} aria-hidden="true" /><h2>Choose an event to begin</h2>
        <p>Select an event above to see its latest guest, seating and dietary progress, plus QR code readiness.</p>
      </Card>}

      {selectedEvent && loading && <div className={styles.cardGrid} aria-live="polite" aria-busy="true" aria-label="Loading event overview">
        {Array.from({ length: 6 }, (_, index) => <div key={index} className={styles.skeletonCard} />)}
      </div>}

      {selectedEvent && error && <Card className={styles.errorState} role="alert"><AlertCircle size={22} aria-hidden="true" /><p>{error} Choose the event again to retry.</p></Card>}

      {selectedEvent && data && !loading && <div className={styles.cardGrid}>
        <Card className={`${styles.overviewCard} ${styles.eventCard}`}>
          <div className={styles.cardHeading}><span className={styles.iconTile}><CalendarDays size={20} strokeWidth={1.7} aria-hidden="true" /></span><div><h2>Event Overview</h2><p>Your saved wedding details</p></div></div>
          <div className={styles.eventName}>{selectedEvent.name}</div>
          <div className={styles.dateRow}><strong>{formatDate(selectedEvent.date)}</strong><span>{getCountdown(selectedEvent.date)}</span></div>
          <div className={styles.venueList}>
            {selectedEvent.ceremony_enabled && <div><span>Ceremony</span><strong>{selectedEvent.ceremony_name || selectedEvent.ceremony_venue || 'Details to be confirmed'}</strong>{(selectedEvent.ceremony_date || selectedEvent.ceremony_start_time) && <small>{[selectedEvent.ceremony_date ? formatDate(selectedEvent.ceremony_date) : null, formatTime(selectedEvent.ceremony_start_time)].filter(Boolean).join(' · ')}</small>}</div>}
            {selectedEvent.reception_enabled !== false && <div><span>Reception</span><strong>{selectedEvent.venue || 'Venue to be confirmed'}</strong>{formatTime(selectedEvent.start_time) && <small>{formatTime(selectedEvent.start_time)}</small>}</div>}
          </div>
          <DashboardAction onClick={() => openPage('my-events')}>View Event Details</DashboardAction>
        </Card>

        <Card className={`${styles.overviewCard} ${styles.guestCard}`}>
          <div className={styles.cardHeading}><span className={styles.iconTile}><UsersRound size={20} strokeWidth={1.7} aria-hidden="true" /></span><div><h2>Guest List</h2><p>Invitation and RSVP overview</p></div></div>
          <div className={styles.primaryMetric}><strong>{data.totalGuests}</strong><span>{data.totalGuests === 1 ? 'guest invited' : 'guests invited'}</span></div>
          <dl className={styles.metricList}><div><dt>Attending</dt><dd>{data.attendingGuests}</dd></div><div><dt>Awaiting RSVP</dt><dd>{data.pendingGuests}</dd></div><div><dt>Declined</dt><dd>{data.declinedGuests}</dd></div></dl>
          <DashboardAction onClick={() => openPage('guest-list')}>View Guest List</DashboardAction>
        </Card>

        <Card className={`${styles.overviewCard} ${styles.seatingCard}`}>
          <div className={styles.cardHeading}><span className={styles.iconTile}><TableProperties size={20} strokeWidth={1.7} aria-hidden="true" /></span><div><h2>Tables &amp; Seating</h2><p>Confirmed guest seating progress</p></div></div>
          <div className={styles.primaryMetric}><strong>{data.tableCount}</strong><span>{data.tableCount === 1 ? 'table created' : 'tables created'}</span></div>
          <dl className={styles.metricList}><div><dt>Assigned</dt><dd>{data.seatedAttendingGuests}</dd></div><div><dt>Still need a table</dt><dd>{data.unseatedAttendingGuests}</dd></div></dl>
          <div className={styles.progressBlock}><div><span>Seating progress</span><strong>{seatingProgress}%</strong></div><div className={styles.progressTrack} role="progressbar" aria-label="Confirmed guest seating progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={seatingProgress}><span style={{ width: `${seatingProgress}%` }} /></div></div>
          <DashboardAction onClick={() => openPage('table-list')}>View Tables</DashboardAction>
        </Card>

        <Card className={`${styles.overviewCard} ${styles.dietaryCard}`}>
          <div className={styles.cardHeading}><span className={styles.iconTile}><Utensils size={20} strokeWidth={1.7} aria-hidden="true" /></span><div><h2>Dietary Requirements</h2><p>Recorded guest requirements</p></div></div>
          <div className={styles.primaryMetric}><strong>{data.dietaryGuests}</strong><span>{data.dietaryGuests === 1 ? 'guest has a requirement' : 'guests have requirements'}</span></div>
          <p className={styles.calmMessage}>{data.dietaryGuests > 0 ? 'Keep these details handy when coordinating with your venue or caterer.' : 'No dietary requirements have been recorded for this event.'}</p>
          <DashboardAction onClick={() => openPage('dietary-chart')}>View Dietary Requirements</DashboardAction>
        </Card>

        <Card className={`${styles.overviewCard} ${styles.attentionCard}`}>
          <div className={styles.cardHeading}><span className={styles.iconTile}><Clock3 size={20} strokeWidth={1.7} aria-hidden="true" /></span><div><h2>Needs Attention</h2><p>Your most useful next actions</p></div></div>
          {attentionItems.length > 0 ? <ul className={styles.attentionList}>{attentionItems.map((item) => <li key={`${item.tabId}-${item.text}`}><button type="button" onClick={() => openPage(item.tabId)}><span className={styles.attentionBadge}><AlertCircle size={14} strokeWidth={1.8} aria-hidden="true" /></span><span>{item.text}</span><ChevronRight size={16} strokeWidth={1.8} aria-hidden="true" /></button></li>)}</ul> : <div className={styles.positiveState}><CircleCheck size={24} strokeWidth={1.7} aria-hidden="true" /><div><strong>Everything looks on track</strong><p>There are no important follow-ups for this event right now.</p></div></div>}
          <DashboardAction onClick={() => openPage(primaryAttention.tabId)}>{attentionActionLabels[primaryAttention.tabId] ?? 'View Event Details'}</DashboardAction>
        </Card>

        <Card className={`${styles.overviewCard} ${styles.setupCard}`}>
          <div className={styles.cardHeading}><span className={styles.iconTile}><UserRoundCheck size={20} strokeWidth={1.7} aria-hidden="true" /></span><div><h2>Wedding Setup Progress</h2><p>{secondaryLoading ? 'Checking QR code readiness…' : `${completedSteps} of 4 steps complete`}</p></div></div>
          <div className={styles.progressTrack} role="progressbar" aria-label="Wedding setup progress" aria-valuemin={0} aria-valuemax={4} aria-valuenow={completedSteps} aria-valuetext={`${completedSteps} of 4 steps complete`}><span style={{ width: `${completedSteps * 25}%` }} /></div>
          <ol className={styles.setupList}>{setupSteps.map((step, index) => <li key={step.label} data-complete={step.complete}><button type="button" onClick={() => openPage(step.tabId)} aria-label={`${step.label}, ${step.pending ? 'checking status' : step.complete ? 'complete' : 'not complete'}`}><span className={styles.stepMarker}>{step.complete ? <Check size={15} aria-hidden="true" /> : index + 1}</span><span>{step.label}</span>{step.tabId === 'qr-code' && <QrCode size={16} aria-hidden="true" />}</button></li>)}</ol>
          <DashboardAction onClick={() => openPage(setupComplete ? 'qr-code' : firstIncompleteSetupTab)}>{setupComplete ? 'View QR Code' : 'Continue Wedding Setup'}</DashboardAction>
        </Card>
      </div>}
      </section>

      {selectedEvent && data && !loading && <EventBudgetPlanner event={selectedEvent} />}
    </div>
  );
};
