import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar, QrCode, Download, Settings, Eye, ExternalLink, Copy } from 'lucide-react';
import { useEvents } from '@/hooks/useEvents';
import { useToast } from '@/hooks/use-toast';
import { QRCodeMainCard } from './QRCodeMainCard';
import { buildGuestLookupUrl } from '@/lib/urlUtils';
import { format, parse } from 'date-fns';
import { formatDisplayTime } from '@/lib/utils';
interface QRCodeSeatingChartProps {
  selectedEventId?: string | null;
  onEventSelect?: (eventId: string) => void;
  onNavigateToTab?: (tab: string) => void;
}
export const QRCodeSeatingChart: React.FC<QRCodeSeatingChartProps> = ({
  selectedEventId,
  onEventSelect,
  onNavigateToTab
}) => {
  const {
    events,
    loading: eventsLoading
  } = useEvents();
  const [localSelectedEventId, setLocalSelectedEventId] = useState<string | null>(selectedEventId || null);
  const {
    toast
  } = useToast();

  // Auto-select first event when available
  useEffect(() => {
    if (!selectedEventId && !localSelectedEventId && !eventsLoading && events.length > 0) {
      const firstId = events[0].id;
      setLocalSelectedEventId(firstId);
      onEventSelect?.(firstId);
    }
  }, [eventsLoading, events, selectedEventId, localSelectedEventId, onEventSelect]);
  const selectedEvent = events.find(event => event.id === (selectedEventId || localSelectedEventId));
  const handleEventSelect = (eventId: string) => {
    // Filter out placeholder values 
    if (eventId === "no-event") {
      return;
    }
    setLocalSelectedEventId(eventId);
    onEventSelect?.(eventId);
  };
  const handleLiveView = () => {
    if (selectedEvent?.slug) {
      const url = buildGuestLookupUrl(selectedEvent.slug);
      window.open(url, '_blank');
    }
  };
  const handleDownloadLink = async () => {
    if (selectedEvent?.slug) {
      const url = buildGuestLookupUrl(selectedEvent.slug);
      try {
        await navigator.clipboard.writeText(url);
        toast({
          title: "Link copied!",
          description: "The guest lookup link has been copied to your clipboard."
        });
      } catch (error) {
        toast({
          title: "Copy failed",
          description: "Unable to copy link. Please try again.",
          variant: "destructive"
        });
      }
    }
  };
  const currentEventId = selectedEventId || localSelectedEventId;

  // Format date with ordinal suffix
  const formatEventDate = (dateString: string) => {
    try {
      const date = parse(dateString, 'yyyy-MM-dd', new Date());
      const day = format(date, 'd');
      const ordinal = (n: number) => {
        const s = ['th', 'st', 'nd', 'rd'];
        const v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
      };
      return format(date, 'EEEE, ') + ordinal(parseInt(day)) + format(date, ' MMMM yyyy');
    } catch {
      return dateString;
    }
  };
  return <div className="space-y-8">
      {/* Header Section */}
      <Card className="ww-box">
        <CardHeader className="pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <QrCode className="w-6 h-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl gradient-text">QR Code Seating Chart</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <label className="text-sm font-medium text-foreground whitespace-nowrap">
              Choose Event:
            </label>
            <Select value={currentEventId || "no-event"} onValueChange={handleEventSelect}>
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder={eventsLoading ? "Loading events..." : "Select an event..."} />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                {events.length > 0 ? events.map(event => <SelectItem key={event.id} value={event.id}>
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4" />
                        <span>{event.name}</span>
                      </div>
                    </SelectItem>) : <SelectItem value="no-events" disabled>
                    {eventsLoading ? "Loading events..." : "No events found"}
                  </SelectItem>}
              </SelectContent>
            </Select>
            
            {selectedEvent && (
              <div className="text-2xl gradient-text font-semibold">
                <span className="font-semibold">{selectedEvent.venue || 'Venue not specified'}</span>
                {' - '}
                <span>{formatEventDate(selectedEvent.date)}</span>
                {(selectedEvent.start_time || selectedEvent.finish_time) && (
                  <>
                    {' - '}
                    {selectedEvent.start_time && (
                      <span>Start {formatDisplayTime(selectedEvent.start_time)}</span>
                    )}
                    {selectedEvent.start_time && selectedEvent.finish_time && ' — '}
                    {selectedEvent.finish_time && (
                      <span>Finish {formatDisplayTime(selectedEvent.finish_time)}</span>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main QR Code Card */}
      {currentEventId && <QRCodeMainCard eventId={currentEventId} />}



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