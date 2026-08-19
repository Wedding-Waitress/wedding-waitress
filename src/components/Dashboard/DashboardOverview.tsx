import React from 'react';
import '@fontsource/manrope/latin-400.css';
import '@fontsource/manrope/latin-500.css';
import '@fontsource/manrope/latin-600.css';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarDays } from 'lucide-react';
import type { Guest } from '@/hooks/useGuests';
import { useFirstEventReferral, type ReferralEventLite } from '@/hooks/useFirstEventReferral';
import { VenueReferralCard } from './VenueReferralCard';
import styles from './DashboardOverview.module.css';

interface EventLite extends ReferralEventLite { id: string; name: string }

interface DashboardOverviewProps {
  selectedEventId: string | null;
  onEventSelect: (eventId: string) => void;
  events: EventLite[];
  guests: Guest[];
  onNavigateToGuestList?: () => void;
}

const MANROPE_FONT = "'Manrope', ui-sans-serif, system-ui, sans-serif";

const EVENT_FIELD_GLASS_STYLE: React.CSSProperties = {
  background: 'linear-gradient(180deg, rgba(255, 239, 218, 0.08) 0%, rgba(17, 9, 7, 0.68) 100%)',
  boxShadow: 'inset 0 1px 0 rgba(255, 244, 229, 0.14), 0 1px 3px rgba(0, 0, 0, 0.22)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  fontFamily: MANROPE_FONT,
};

const EVENT_MENU_GLASS_STYLE: React.CSSProperties = {
  ...EVENT_FIELD_GLASS_STYLE,
  background: 'linear-gradient(180deg, rgba(255, 239, 218, 0.08) 0%, rgba(17, 9, 7, 0.68) 100%), rgba(22, 11, 8, 0.95)',
  boxShadow: 'inset 0 1px 0 rgba(255, 244, 229, 0.14)',
};

const GLASS_PANEL_CLASS_NAME = '!bg-none !bg-[#21130f]/62 !border-[#c9975d]/40 !shadow-[inset_0_1px_0_rgba(255,239,218,0.21),0_18px_42px_rgba(3,1,1,0.42)]';
const GLASS_PANEL_STYLE: React.CSSProperties = { backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)' };

/**
 * DashboardOverview — minimal landing surface.
 *
 * RSVP operational widgets (Activate RSVP, RSVP Allowance, Quick Stats,
 * Over-limit alert) have been consolidated into the Guest List page, which
 * is now the single Smart RSVP & Messaging command centre. This page is
 * reserved for future business analytics.
 */
export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  onEventSelect,
  events,
}) => {
  const { referralEvent, dismiss } = useFirstEventReferral(events);
  const [dashboardEventId, setDashboardEventId] = React.useState('');

  const handleDashboardEventSelect = (eventId: string) => {
    setDashboardEventId(eventId);
    onEventSelect(eventId);
  };

  return (
    <div className={`max-w-6xl mx-auto space-y-6 ${styles.overview}`} style={{ fontFamily: MANROPE_FONT }}>
      <div>
        <h1 className={`text-xl sm:text-2xl font-semibold tracking-[-0.012em] leading-tight text-white break-words ${styles.heading}`}>Dashboard</h1>
        <p className="text-sm font-normal text-white/80 break-words">
          Overview of your event. RSVP &amp; messaging operations live in Guest List.
        </p>
      </div>

      {referralEvent && (
        <VenueReferralCard event={referralEvent} onDismiss={dismiss} />
      )}

      {events.length > 0 && (
        <Card className={`p-4 ${GLASS_PANEL_CLASS_NAME} ${styles.eventPanel}`} style={GLASS_PANEL_STYLE}>
          <label id="dashboard-event-selector-label" className="text-sm font-medium text-white flex items-center gap-2 mb-2">
            <CalendarDays size={18} strokeWidth={1.8} className="text-[#d9b77f] shrink-0" aria-hidden />
            <span>Choose Event<span aria-hidden>:</span></span>
          </label>
          <Select value={dashboardEventId} onValueChange={handleDashboardEventSelect}>
            <SelectTrigger
              aria-labelledby="dashboard-event-selector-label"
              className={`h-11 text-sm font-medium text-white border-[#b9824d]/40 [&>svg]:text-[#ead8bd] [&>svg]:opacity-100 ${styles.eventField}`}
              style={EVENT_FIELD_GLASS_STYLE}
            >
              <span
                className="!flex flex-1 min-w-0 items-center gap-2 overflow-hidden text-left [&>span]:truncate"
                data-testid="dashboard-event-value"
              >
                <CalendarDays size={17} strokeWidth={1.8} className="text-[#d9b77f] shrink-0" aria-hidden />
                <SelectValue />
              </span>
            </SelectTrigger>
            <SelectContent className={`!border-[#b9824d]/40 text-white ${styles.eventMenu}`} style={EVENT_MENU_GLASS_STYLE}>
              {events.map(e => (
                <SelectItem
                  key={e.id}
                  value={e.id}
                  className="text-sm font-medium text-white focus:!bg-[#8b4d28]/60 focus:!text-white data-[state=checked]:!bg-[#73401f]/55 data-[state=checked]:!text-white [&_svg]:text-[#e4ad6d] [&_svg]:opacity-100"
                >{e.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Card>
      )}
    </div>
  );
};
