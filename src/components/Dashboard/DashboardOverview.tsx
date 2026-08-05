import React from 'react';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarDays, ChartNoAxesCombined } from 'lucide-react';
import type { Guest } from '@/hooks/useGuests';
import { useFirstEventReferral, type ReferralEventLite } from '@/hooks/useFirstEventReferral';
import { VenueReferralCard } from './VenueReferralCard';

interface EventLite extends ReferralEventLite { id: string; name: string }

interface DashboardOverviewProps {
  selectedEventId: string | null;
  onEventSelect: (eventId: string) => void;
  events: EventLite[];
  guests: Guest[];
  onNavigateToGuestList?: () => void;
}

/**
 * DashboardOverview — minimal landing surface.
 *
 * RSVP operational widgets (Activate RSVP, RSVP Allowance, Quick Stats,
 * Over-limit alert) have been consolidated into the Guest List page, which
 * is now the single Smart RSVP & Messaging command centre. This page is
 * reserved for future business analytics.
 */
export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  selectedEventId,
  onEventSelect,
  events,
}) => {
  const { referralEvent, dismiss } = useFirstEventReferral(events);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">
          Overview of your event. RSVP &amp; messaging operations live in Guest List.
        </p>
      </div>

      {referralEvent && (
        <VenueReferralCard event={referralEvent} onDismiss={dismiss} />
      )}

      {events.length > 0 && (
        <Card className="ww-box">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <label className="text-sm font-medium text-foreground whitespace-nowrap inline-flex items-center gap-2">
              <CalendarDays size={18} strokeWidth={1.8} className="shrink-0" aria-hidden />
              Choose Event:
            </label>
            <Select value={selectedEventId || 'no-event'} onValueChange={onEventSelect}>
              <SelectTrigger className="w-full sm:w-[320px] border-primary focus:ring-primary [&>span]:font-bold [&>span]:text-[#967A59]">
                <SelectValue placeholder="Select an event..." />
              </SelectTrigger>
              <SelectContent>
                {events.map(e => (
                  <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Card>
      )}

      {!selectedEventId ? (
        <Card className="ww-box text-center py-10">
          <CardTitle className="text-lg">Select an event to begin</CardTitle>
          <CardDescription className="mt-2">
            Choose an event above. RSVP &amp; messaging tools live on the Guest List page.
          </CardDescription>
        </Card>
      ) : (
        <Card className="ww-box">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
              <ChartNoAxesCombined size={22} strokeWidth={1.8} className="text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-foreground">Business analytics coming soon</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Detailed RSVP, delivery and guest intelligence is now centralized on the Guest List page under
                <span className="font-medium text-foreground"> Smart RSVP Analytics</span>.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
