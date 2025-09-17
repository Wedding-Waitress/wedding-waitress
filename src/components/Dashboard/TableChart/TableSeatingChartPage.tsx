import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/enhanced-button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { TableChartCustomizer } from './TableChartCustomizer';
import { TableChartPreview } from './TableChartPreview';
import { TableChartExporter } from './TableChartExporter';
import { useEvents } from '@/hooks/useEvents';
import { useTables } from '@/hooks/useTables';
import { useRealtimeGuests } from '@/hooks/useRealtimeGuests';
import { 
  Calendar, 
  Layout, 
  Download, 
  Settings,
  Users,
  Table as TableIcon
} from 'lucide-react';

interface TableSeatingChartPageProps {
  selectedEventId: string | null;
  onEventSelect: (eventId: string) => void;
}

export interface ChartSettings {
  layout: 'grid' | 'organic' | 'custom';
  tableShape: 'round' | 'rectangular' | 'mixed';
  colorCoding: 'rsvp' | 'dietary' | 'capacity' | 'none';
  includeNames: boolean;
  includeDietary: boolean;
  includeRsvp: boolean;
  showTableNumbers: boolean;
  showCapacity: boolean;
  paperSize: 'A4' | 'A3' | 'A2' | 'A1';
  fontSize: 'small' | 'medium' | 'large';
  title: string;
  subtitle: string;
}

const DEFAULT_SETTINGS: ChartSettings = {
  layout: 'grid',
  tableShape: 'round',
  colorCoding: 'rsvp',
  includeNames: true,
  includeDietary: true,
  includeRsvp: true,
  showTableNumbers: true,
  showCapacity: true,
  paperSize: 'A4',
  fontSize: 'medium',
  title: 'Seating Chart',
  subtitle: ''
};

export const TableSeatingChartPage: React.FC<TableSeatingChartPageProps> = ({
  selectedEventId,
  onEventSelect
}) => {
  const [settings, setSettings] = useState<ChartSettings>(DEFAULT_SETTINGS);
  const [isExporting, setIsExporting] = useState(false);
  
  const { events, loading: eventsLoading } = useEvents();
  const { tables, loading: tablesLoading } = useTables(selectedEventId);
  const { guests, loading: guestsLoading } = useRealtimeGuests(selectedEventId);

  const selectedEvent = selectedEventId ? events.find(e => e.id === selectedEventId) : null;

  // Update subtitle when event changes
  useEffect(() => {
    if (selectedEvent) {
      setSettings(prev => ({
        ...prev,
        subtitle: `${selectedEvent.name} - ${selectedEvent.date || 'Date TBD'}`
      }));
    }
  }, [selectedEvent]);

  const handleSettingsChange = (newSettings: Partial<ChartSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const handleExport = async (format: 'pdf' | 'png' | 'jpg') => {
    setIsExporting(true);
    try {
      // Export logic will be handled by TableChartExporter
      console.log('Exporting as:', format);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Generate the chart content for printing
    const chartHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Table Seating Chart</title>
          <style>
            @media print {
              @page { 
                size: A4 portrait;
                margin: 10mm;
              }
              body { margin: 0; padding: 0; }
            }
            body { font-family: Arial, sans-serif; }
          </style>
        </head>
        <body>
          <div style="width: 210mm; height: 297mm; display: flex; justify-content: center; align-items: center;">
            <p>Print functionality - Chart will be rendered here</p>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(chartHTML);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  const isDataReady = selectedEventId && tables.length > 0 && !tablesLoading && !guestsLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="pb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="space-y-4 flex-1">
              {/* Event Selector */}
              <div className="flex items-center space-x-4">
                <label className="text-sm font-medium text-foreground">
                  Choose Event:
                </label>
                <Select value={selectedEventId || ""} onValueChange={onEventSelect}>
                  <SelectTrigger className="w-[300px]">
                    <SelectValue placeholder={eventsLoading ? "Loading events..." : "Select an event..."} />
                  </SelectTrigger>
                  <SelectContent>
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

              {/* Event Title */}
              {selectedEvent && (
                <div className="flex items-center space-x-2">
                  <span className="text-lg font-medium text-foreground">Table Seating Chart for</span>
                  <span className="text-lg font-bold text-primary">{selectedEvent.name}</span>
                </div>
              )}
            </div>

            {/* Header Icon & Description */}
            <div className="flex items-start gap-3">
              <TableIcon className="w-16 h-16 text-primary flex-shrink-0" />
              <div className="flex flex-col">
                <CardTitle className="mb-2 text-left">Table Seating Chart</CardTitle>
                <CardDescription className="text-left">
                  Generate professional seating charts for your venue staff and coordinators
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Data Status */}
      {selectedEventId && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {guests.length} guests across {tables.length} tables
                  </span>
                </div>
                <Badge 
                  variant={isDataReady ? "default" : "secondary"}
                  className="text-xs"
                >
                  {isDataReady ? 'Ready to Generate' : 'Loading Data...'}
                </Badge>
              </div>
              
              {isDataReady && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExport('pdf')}
                    disabled={isExporting}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export PDF
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExport('png')}
                    disabled={isExporting}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export PNG
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handlePrint}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Print
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {selectedEventId ? (
        isDataReady ? (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Customization Panel */}
            <div className="lg:col-span-1">
              <TableChartCustomizer
                settings={settings}
                onSettingsChange={handleSettingsChange}
                tables={tables}
                guests={guests}
              />
            </div>

            {/* Preview */}
            <div className="lg:col-span-3">
              <TableChartPreview
                settings={settings}
                tables={tables}
                guests={guests}
                event={selectedEvent}
              />
            </div>
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <Layout className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <CardTitle className="mb-2">Loading Event Data</CardTitle>
              <CardDescription>
                Please wait while we load your tables and guest information...
              </CardDescription>
            </CardContent>
          </Card>
        )
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <Calendar className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <CardTitle className="mb-2">Select an Event</CardTitle>
            <CardDescription>
              Choose an event from the dropdown above to generate your table seating chart
            </CardDescription>
          </CardContent>
        </Card>
      )}

      {/* Export Modal */}
      <TableChartExporter
        isOpen={isExporting}
        onClose={() => setIsExporting(false)}
        settings={settings}
        tables={tables}
        guests={guests}
        event={selectedEvent}
      />
    </div>
  );
};