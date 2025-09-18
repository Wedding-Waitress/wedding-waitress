import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/enhanced-button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Printer, Download, FileText, Users } from 'lucide-react';
import { useEvents } from '@/hooks/useEvents';
import { useRealtimeGuests } from '@/hooks/useRealtimeGuests';
import { FullSeatingChartPreview } from './FullSeatingChartPreview';
import { FullSeatingChartExporter } from './FullSeatingChartExporter';

interface FullSeatingChartPageProps {
  selectedEventId: string | null;
  onEventSelect: (eventId: string) => void;
}

export const FullSeatingChartPage: React.FC<FullSeatingChartPageProps> = ({
  selectedEventId,
  onEventSelect
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [showExporter, setShowExporter] = useState(false);
  const { events, loading: eventsLoading } = useEvents();
  const { guests, loading: guestsLoading } = useRealtimeGuests(selectedEventId);

  const selectedEvent = selectedEventId ? events.find(e => e.id === selectedEventId) : null;

  const handleEventSelect = (eventId: string) => {
    if (eventId === "no-event") return;
    onEventSelect(eventId);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    setShowExporter(true);
  };

  // Sort guests alphabetically by full name
  const sortedGuests = React.useMemo(() => {
    return [...guests].sort((a, b) => {
      const nameA = `${a.first_name} ${a.last_name || ''}`.trim();
      const nameB = `${b.first_name} ${b.last_name || ''}`.trim();
      return nameA.localeCompare(nameB);
    });
  }, [guests]);

  const isDataReady = selectedEventId && !guestsLoading && guests.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-4">
            {/* Event Selector */}
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium text-foreground">
                Choose Event:
              </label>
              <Select value={selectedEventId || "no-event"} onValueChange={handleEventSelect}>
                <SelectTrigger className="w-[300px]">
                  <SelectValue placeholder={eventsLoading ? "Loading events..." : "Select an event..."} />
                </SelectTrigger>
                <SelectContent>
                  {events.length > 0 ? (
                    events.map((event) => (
                      <SelectItem key={event.id} value={event.id}>
                        <div className="flex items-center space-x-2">
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

            {/* Event Details */}
            {selectedEvent && (
              <div className="flex items-center space-x-2">
                <span className="text-lg font-medium text-foreground">Full Seating Chart for</span>
                <span className="text-lg font-bold text-primary">{selectedEvent.name}</span>
              </div>
            )}
          </div>

          {/* Header Icon & Info */}
          <div className="flex items-center gap-4">
            <FileText className="w-12 h-12 text-primary" />
            <div>
              <CardTitle className="text-right">Full Seating Chart</CardTitle>
              <CardDescription className="text-right">
                Complete guest list with check-off boxes
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Data Status & Actions */}
      {selectedEventId && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  <span className="text-sm font-medium">
                    {guestsLoading ? "Loading..." : `${guests.length} guests`}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${isDataReady ? 'bg-green-500' : 'bg-yellow-500'}`} />
                  <span className="text-sm text-muted-foreground">
                    {isDataReady ? "Ready for generation" : "Preparing data..."}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrint}
                  disabled={!isDataReady}
                  className="hidden sm:flex"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Print
                </Button>
                
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleExport}
                  disabled={!isDataReady || isExporting}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export PDF
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      {selectedEventId ? (
        isDataReady ? (
          <FullSeatingChartPreview 
            event={selectedEvent!} 
            guests={sortedGuests} 
          />
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <CardTitle className="mb-2 text-muted-foreground">
                {guestsLoading ? "Loading guest data..." : "No guests found"}
              </CardTitle>
              <CardDescription>
                {guestsLoading 
                  ? "Please wait while we load your guest information."
                  : "Add some guests to generate your seating chart."
                }
              </CardDescription>
            </CardContent>
          </Card>
        )
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <CardTitle className="mb-2 text-muted-foreground">Select an Event</CardTitle>
            <CardDescription>
              Choose an event to generate your full seating chart with guest check-off boxes.
            </CardDescription>
          </CardContent>
        </Card>
      )}

      {/* Export Modal */}
      {showExporter && selectedEvent && (
        <FullSeatingChartExporter
          event={selectedEvent}
          guests={sortedGuests}
          onClose={() => setShowExporter(false)}
          onExportStart={() => setIsExporting(true)}
          onExportEnd={() => setIsExporting(false)}
        />
      )}
    </div>
  );
};