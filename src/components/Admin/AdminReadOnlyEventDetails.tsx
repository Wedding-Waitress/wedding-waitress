import { CalendarDays, HeartHandshake, PartyPopper } from 'lucide-react';
import { SectionCard } from '@/components/Account/SectionCard';
import styles from '@/components/Dashboard/MyEventsPage.module.css';
const stringFields = ['name', 'date', 'venue', 'venue_address', 'venue_phone', 'venue_contact', 'venue_contact_email', 'start_time', 'finish_time', 'rsvp_deadline', 'partner1_name', 'partner2_name', 'ceremony_name', 'ceremony_date', 'ceremony_venue', 'ceremony_venue_address', 'ceremony_venue_phone', 'ceremony_venue_contact', 'ceremony_venue_contact_email', 'ceremony_start_time', 'ceremony_finish_time', 'ceremony_rsvp_deadline', 'event_timezone', 'event_type', 'relation_mode'];
function valid(value: unknown, owner: string, event: string): value is Record<string, any> {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return row.user_id === owner && row.id === event && typeof row.name === 'string'
    && stringFields.every(key => key in row && (row[key] === null || typeof row[key] === 'string'))
    && ['guest_limit', 'ceremony_guest_limit'].every(key => row[key] === null || Number.isSafeInteger(row[key]) && Number(row[key]) >= 0)
    && ['ceremony_enabled', 'reception_enabled', 'allow_guest_plus_ones'].every(key => row[key] === null || typeof row[key] === 'boolean');
}
export function AdminReadOnlyEventDetails({ ownerId, eventId, savedEvent, guestCount, tableCount }: { ownerId: string; eventId: string; savedEvent: unknown; guestCount: number; tableCount: number }) {
  if (!valid(savedEvent, ownerId, eventId)) return <p>Complete owned event details are unavailable. Missing event settings have not been invented.</p>;
  const shown = (value: unknown) => value === null || value === '' ? 'Not recorded' : String(value);
  const enabled = (value: boolean | null) => value === null ? 'Not recorded' : value ? 'Enabled' : 'Disabled';
  const fields = (rows: [string, unknown][]) => <dl className={`space-y-1 text-xs sm:text-sm text-muted-foreground ${styles.detailText}`}>{rows.map(([label, value]) => <div key={label} className="break-words"><dt className="font-medium inline">{label}: </dt><dd className="inline whitespace-pre-wrap">{shown(value)}</dd></div>)}</dl>;
  return <SectionCard icon={CalendarDays} title="My Events" description="Saved event details — read-only">
    <h3 className="text-lg font-semibold mb-3">{savedEvent.name}</h3><p>{guestCount} saved guests · {tableCount} saved tables</p>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
      <div className={`min-w-0 bg-muted/30 rounded-xl p-3 sm:p-4 border border-border text-left shadow-[0_4px_20px_-4px_rgba(0,0,0,0.15)] ${styles.detailCard}`}>
        <h4 className={`font-semibold text-primary mb-2 inline-flex items-center gap-2 ${styles.detailHeading}`}><HeartHandshake size={20} aria-hidden="true"/>Ceremony</h4>
        {fields([['Status', enabled(savedEvent.ceremony_enabled)], ['Name', savedEvent.ceremony_name], ['Date', savedEvent.ceremony_date], ['Venue', savedEvent.ceremony_venue], ['Address', savedEvent.ceremony_venue_address], ['Start', savedEvent.ceremony_start_time], ['Finish', savedEvent.ceremony_finish_time], ['Guest limit', savedEvent.ceremony_guest_limit], ['RSVP deadline', savedEvent.ceremony_rsvp_deadline], ['Venue phone', savedEvent.ceremony_venue_phone], ['Venue contact', savedEvent.ceremony_venue_contact], ['Venue email', savedEvent.ceremony_venue_contact_email]])}
      </div>
      <div className={`min-w-0 bg-muted/30 rounded-xl p-3 sm:p-4 border border-border text-left shadow-[0_4px_20px_-4px_rgba(0,0,0,0.15)] ${styles.detailCard}`}>
        <h4 className={`font-semibold text-primary mb-2 inline-flex items-center gap-2 ${styles.detailHeading}`}><PartyPopper size={20} aria-hidden="true"/>Reception</h4>
        {fields([['Status', enabled(savedEvent.reception_enabled)], ['Date', savedEvent.date], ['Venue', savedEvent.venue], ['Address', savedEvent.venue_address], ['Start', savedEvent.start_time], ['Finish', savedEvent.finish_time], ['Guest limit', savedEvent.guest_limit], ['RSVP deadline', savedEvent.rsvp_deadline], ['Venue phone', savedEvent.venue_phone], ['Venue contact', savedEvent.venue_contact], ['Venue email', savedEvent.venue_contact_email]])}
      </div>
    </div>
    <div className="mt-4">{fields([['Partner 1', savedEvent.partner1_name], ['Partner 2', savedEvent.partner2_name], ['Recorded timezone', savedEvent.event_timezone], ['Recorded seating type', savedEvent.event_type], ['Recorded relationship mode', savedEvent.relation_mode], ['Guest +1 setting', enabled(savedEvent.allow_guest_plus_ones)]])}</div>
    <p className="mt-4 text-sm">Dates and times above are the saved values, not inferred from the administrator’s timezone. The separate countdown preserves the customer browser-local calculation; event-edit controls remain unavailable.</p>
  </SectionCard>;
}
