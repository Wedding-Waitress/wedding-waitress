import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar, QrCode, Download, Settings, Eye } from 'lucide-react';
import { useEvents } from '@/hooks/useEvents';
import { QRCodeMainCard } from './QRCodeMainCard';
import { QRCodeFeatureGrid } from './QRCodeFeatureGrid';

interface QRCodeSeatingChartProps {
  selectedEventId?: string | null;
  onEventSelect?: (eventId: string) => void;
}

export const QRCodeSeatingChart: React.FC<QRCodeSeatingChartProps> = ({
  selectedEventId,
  onEventSelect,
}) => {
  const { events, loading: eventsLoading } = useEvents();
  const [localSelectedEventId, setLocalSelectedEventId] = useState<string | null>(selectedEventId || null);

  const selectedEvent = events.find(event => event.id === (selectedEventId || localSelectedEventId));

  const handleEventSelect = (eventId: string) => {
    setLocalSelectedEventId(eventId);
    onEventSelect?.(eventId);
  };

  const currentEventId = selectedEventId || localSelectedEventId;

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <Card className="border-primary/20 bg-gradient-card">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <QrCode className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl gradient-text">QR Code Seating Chart</CardTitle>
                <CardDescription className="text-base">
                  Create beautiful QR codes for seamless guest seating
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-foreground whitespace-nowrap">
              Choose Event:
            </label>
            <Select value={currentEventId || ""} onValueChange={handleEventSelect}>
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder={eventsLoading ? "Loading events..." : "Select an event..."} />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                {events.length > 0 ? (
                  events.map((event) => (
                    <SelectItem key={event.id} value={event.id}>
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4" />
                        <span>{event.name}</span>
                      </div>
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-events" disabled>
                    {eventsLoading ? "Loading events..." : "No events found"}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {selectedEvent && (
            <div className="mt-4 p-4 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">
                    QR Code Seating Chart for: <span className="text-primary">{selectedEvent.name}</span>
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Event Date: {selectedEvent.date} • Venue: {selectedEvent.venue || 'Not specified'}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm">
                    <Eye className="w-4 h-4 mr-2" />
                    Preview
                  </Button>
              <Button variant="default" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main QR Code Card */}
      {currentEventId && (
        <QRCodeMainCard eventId={currentEventId} />
      )}

      {/* Feature Grid */}
      {currentEventId && (
        <QRCodeFeatureGrid eventId={currentEventId} />
      )}

      {/* Placeholder when no event selected */}
      {!currentEventId && (
        <Card className="p-12 text-center">
          <QrCode className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <CardTitle className="text-xl mb-2 text-muted-foreground">Select an Event</CardTitle>
          <CardDescription className="text-base">
            Choose an event above to start creating your QR Code Seating Chart
          </CardDescription>
        </Card>
      )}
    </div>
  );
};