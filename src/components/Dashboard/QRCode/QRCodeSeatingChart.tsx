/**
 * PRODUCTION-READY -- LOCKED FOR PRODUCTION
 *
 * The QR Code Seating Chart feature is COMPLETE and APPROVED for production use.
 *
 * CRITICAL RULES:
 * - DO NOT modify without explicit owner approval
 * - Changes could break QR code generation and customisation
 * - Changes could break the guest lookup link system
 * - Changes could break real-time event syncing
 *
 * Last locked: 2026-02-19
 */
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarDays, QrCode } from 'lucide-react';
import type { Event } from '@/hooks/useEvents';
import { QRCodeMainCard } from './QRCodeMainCard';
import styles from './QRCodeSeatingChart.module.css';

interface QRCodeSeatingChartProps {
  selectedEventId?: string | null;
  onEventSelect?: (eventId: string) => void;
  onNavigateToTab?: (tab: string) => void;
  events: Event[];
  eventsLoading: boolean;
}

export const QRCodeSeatingChart: React.FC<QRCodeSeatingChartProps> = ({
  selectedEventId,
  onEventSelect,
  events,
  eventsLoading,
}) => {
  const selectedEvent = events.find(event => event.id === selectedEventId);
  const currentEventId = selectedEventId;

  const handleEventSelect = (eventId: string) => {
    if (eventId === 'no-event') return;
    onEventSelect?.(eventId);
  };

  return <div className={`space-y-8 ${styles.page}`}>
      {/* Header Section */}
      <Card className={`${styles.eventPanel} border border-primary shadow-[0_4px_20px_-4px_rgba(0,0,0,0.15)]`}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="shrink-0">
              <QrCode className="w-6 h-6 text-primary" strokeWidth={1.8} />
            </div>
            <CardTitle className="text-2xl font-bold text-foreground">QR Code Seating Chart</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <label className="text-sm font-medium text-foreground whitespace-nowrap">
              Choose Event:
            </label>
            <Select value={currentEventId || 'no-event'} onValueChange={handleEventSelect}>
              <SelectTrigger className={`${styles.selectTrigger} w-full sm:w-[300px] border-primary focus:ring-primary font-bold text-[#967A59]`}>
                <div className="flex items-center gap-[7px] min-w-0">
                  <CalendarDays className="w-[17px] h-[17px] shrink-0" strokeWidth={1.8} aria-hidden="true" />
                  <SelectValue placeholder="Choose Event" />
                </div>
              </SelectTrigger>
              <SelectContent className="ww-qr-select-menu bg-popover border-border z-50">
                {events.length > 0 ? events.map(event => <SelectItem key={event.id} value={event.id}>
                      <div className="flex items-center space-x-2">
                        <CalendarDays className="w-[17px] h-[17px]" strokeWidth={1.8} />
                        <span>{event.name}</span>
                      </div>
                    </SelectItem>) : <SelectItem value="no-events" disabled>
                    {eventsLoading ? 'Loading events...' : 'No events found'}
                  </SelectItem>}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Main QR Code Card */}
      {currentEventId && selectedEvent && <QRCodeMainCard eventId={currentEventId} event={selectedEvent} />}

      {/* Placeholder when no event selected */}
      {!currentEventId && <Card className="ww-box p-12 text-center">
          <QrCode className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <CardTitle className="text-xl mb-2 text-muted-foreground">Select an Event</CardTitle>
          <CardDescription className="text-base">
            Choose an event above to start creating your QR Code Seating Chart
          </CardDescription>
        </Card>}
    </div>;
};
