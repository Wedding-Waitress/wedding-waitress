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
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar, QrCode, Download, Settings, Eye, ExternalLink, Copy } from 'lucide-react';
import { useEvents } from '@/hooks/useEvents';
import { useToast } from '@/hooks/use-toast';
import { QRCodeMainCard } from './QRCodeMainCard';
import { DynamicQRManager } from './DynamicQRManager';
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
  const { toast } = useToast();
  const selectedEvent = events.find(event => event.id === selectedEventId);
  const handleEventSelect = (eventId: string) => {
    if (eventId === "no-event") return;
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
  const currentEventId = selectedEventId;

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
              <CardTitle className="text-2xl font-medium text-foreground">QR Code Seating Chart</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <label className="text-sm font-medium text-foreground whitespace-nowrap">
                Choose Event:
              </label>
              <Select value={currentEventId || "no-event"} onValueChange={handleEventSelect}>
                <SelectTrigger className="w-full sm:w-[300px] border-primary focus:ring-primary font-bold text-[#7248e6]">
                  <SelectValue placeholder="Choose Event" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border z-50">
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
            </div>
            
            {selectedEvent && (
              <div className="text-sm sm:text-lg font-medium text-[#7248e6] space-y-1 sm:space-y-0">
                <span className="block sm:inline">{selectedEvent.venue || 'Venue not specified'}</span>
                <span className="hidden sm:inline">{' - '}</span>
                <span className="block sm:inline">{formatEventDate(selectedEvent.date)}</span>
                {(selectedEvent.start_time || selectedEvent.finish_time) && (
                  <span className="block sm:inline">
                    <span className="hidden sm:inline">{' - '}</span>
                    {selectedEvent.start_time && (
                      <span>Start {formatDisplayTime(selectedEvent.start_time)}</span>
                    )}
                    {selectedEvent.start_time && selectedEvent.finish_time && ' — '}
                    {selectedEvent.finish_time && (
                      <span>Finish {formatDisplayTime(selectedEvent.finish_time)}</span>
                    )}
                  </span>
                )}
              </div>
            )}
          </div>
          
          {/* Connected & Synced Status Bar */}
          {selectedEvent && (
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 bg-green-50 border border-green-300 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse flex-shrink-0"></div>
              <span className="text-xs sm:text-sm font-medium text-green-800">Connected & Synced</span>
              <span className="hidden sm:inline text-sm text-green-700">—</span>
              <span className="text-xs sm:text-sm text-green-700 truncate">Linked: <strong>{selectedEvent.name}</strong></span>
              <span className="hidden sm:inline text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded ml-auto">📱 Opens guest lookup</span>
            </div>
          )}
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

      {/* Dynamic QR Codes Section */}
      <DynamicQRManager />
    </div>;
};