import React from 'react';
import { CalendarDays, WalletCards } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Event } from '@/hooks/useEvents';
import { EventBudgetPlanner } from './EventBudgetPlanner/EventBudgetPlanner';
import styles from './DashboardOverview.module.css';

type DashboardEvent = Pick<Event, 'id' | 'name'> & Partial<Pick<Event, 'date'>>;

interface DashboardOverviewProps {
  onNavigateToTab: (tabId: string, eventId?: string) => void;
  selectedEventId: string | null;
  onEventSelect: (eventId: string) => void;
  events: DashboardEvent[];
  eventsLoading?: boolean;
}

const MANROPE_FONT = "'Manrope', ui-sans-serif, system-ui, sans-serif";

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  selectedEventId,
  onEventSelect,
  events,
  eventsLoading = false,
}) => {
  const [exportTarget, setExportTarget] = React.useState<HTMLDivElement | null>(null);
  const selectedEvent = events.find((event) => event.id === selectedEventId) ?? null;

  return (
    <div className={`w-full max-w-none ${styles.overview}`} style={{ fontFamily: MANROPE_FONT }}>
      <Card className={styles.eventPanel}>
        <div className={styles.pageIntro}>
        <header className={styles.pageHeader}>
          <WalletCards size={25} strokeWidth={1.8} className={styles.headingIcon} aria-hidden="true" /><div><h1 className={styles.heading}>Event Budget Planner</h1>
          <p>View your event at a glance and plan, track and manage your event budget.</p></div>
        </header>
        <div className={styles.eventSelectorRow}>
          <label id="dashboard-event-selector-label" className={styles.eventLabel}>
            <CalendarDays size={18} strokeWidth={1.8} aria-hidden="true" />
            <span>Choose Event<span aria-hidden>:</span></span>
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
        </div>
        </div>
        <div ref={setExportTarget} className={styles.exportMount} />
      </Card>

      {selectedEvent && <EventBudgetPlanner key={selectedEvent.id} event={selectedEvent} exportTarget={exportTarget} />}
    </div>
  );
};
