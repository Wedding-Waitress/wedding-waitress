import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/enhanced-button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Printer, Download, FileText, Users, Layout } from 'lucide-react';
import { useEvents } from '@/hooks/useEvents';
import { useRealtimeGuests } from '@/hooks/useRealtimeGuests';
import { useFullSeatingChartSettings } from '@/hooks/useFullSeatingChartSettings';
import { FullSeatingChartPreview } from './FullSeatingChartPreview';
import { FullSeatingChartExporter } from './FullSeatingChartExporter';
import { FullSeatingChartCustomizer } from './FullSeatingChartCustomizer';

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
  const { settings, loading: settingsLoading, updateSettings } = useFullSeatingChartSettings(selectedEventId);

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

  // Sort guests based on selected sort option from settings
  const sortedGuests = React.useMemo(() => {
    return [...guests].sort((a, b) => {
      if (settings.sortBy === 'firstName') {
        const nameA = `${a.first_name} ${a.last_name || ''}`.trim();
        const nameB = `${b.first_name} ${b.last_name || ''}`.trim();
        return nameA.localeCompare(nameB);
      } else if (settings.sortBy === 'lastName') {
        const lastNameA = a.last_name || '';
        const lastNameB = b.last_name || '';
        if (lastNameA === lastNameB) {
          return a.first_name.localeCompare(b.first_name);
        }
        return lastNameA.localeCompare(lastNameB);
      } else {
        // sortBy === 'tableNo'
        const tableA = a.table_no || Number.MAX_SAFE_INTEGER;
        const tableB = b.table_no || Number.MAX_SAFE_INTEGER;
        if (tableA === tableB) {
          return a.first_name.localeCompare(b.first_name);
        }
        return tableA - tableB;
      }
    });
  }, [guests, settings.sortBy]);

  const isDataReady = selectedEventId && !guestsLoading && guests.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="ww-box print:hidden">
        <CardHeader className="space-y-4">
          {/* Event Selector */}
          <div className="flex items-center justify-between">
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
          </div>

          {/* Event Details with Status & Actions */}
          {selectedEvent && (
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center gap-4">
                <span className="text-lg font-medium text-foreground">Full Seating Chart for</span>
                <span className="text-lg font-bold text-primary">{selectedEvent.name}</span>
                <div className="flex items-center gap-2 ml-4">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {guestsLoading ? "Loading..." : `${guests.length} guests`}
                  </span>
                </div>
                <Badge 
                  variant={isDataReady ? "default" : "secondary"}
                  className="text-xs"
                >
                  {isDataReady ? 'Ready to Generate' : 'Loading Data...'}
                </Badge>
              </div>

              {/* Action Buttons */}
              {isDataReady && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrint}
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    Print
                  </Button>
                  
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleExport}
                    disabled={isExporting}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export PDF
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardHeader>
      </Card>

      {/* Main Content */}
      {selectedEventId ? (
        isDataReady ? (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Customization Panel */}
            <div className="lg:col-span-1">
              <FullSeatingChartCustomizer
                settings={settings}
                onSettingsChange={updateSettings}
              />
            </div>

            {/* Preview */}
            <div className="lg:col-span-3">
              <FullSeatingChartPreview 
                event={selectedEvent!} 
                guests={sortedGuests}
                settings={settings}
              />
            </div>
          </div>
        ) : (
          <Card className="ww-box print:hidden">
            <CardContent className="p-8 text-center">
              <Layout className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <CardTitle className="mb-2">Loading Event Data</CardTitle>
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
        <Card className="ww-box print:hidden">
          <CardContent className="p-8 text-center">
            <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <CardTitle className="mb-2">Select an Event</CardTitle>
            <CardDescription>
              Choose an event from the dropdown above to generate your full seating chart
            </CardDescription>
          </CardContent>
        </Card>
      )}

      {/* Export Modal */}
      {showExporter && selectedEvent && (
        <FullSeatingChartExporter
          event={selectedEvent}
          guests={sortedGuests}
          settings={settings}
          onClose={() => setShowExporter(false)}
          onExportStart={() => setIsExporting(true)}
          onExportEnd={() => setIsExporting(false)}
        />
      )}
    </div>
  );
};