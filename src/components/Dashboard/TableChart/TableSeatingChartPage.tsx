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
  tableShape: 'round' | 'square';
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

  const handleEventSelect = (eventId: string) => {
    // Filter out placeholder values
    if (eventId === "no-event") {
      return;
    }
    onEventSelect(eventId);
  };

  // Format date as "Sunday 23rd November 2025"
  const formatEventDate = (dateString: string): string => {
    if (!dateString) return 'Date TBD';
    
    const date = new Date(dateString);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    const day = date.getDate();
    const month = date.toLocaleDateString('en-US', { month: 'long' });
    const year = date.getFullYear();
    
    // Add ordinal suffix (1st, 2nd, 3rd, 4th, etc.)
    const getOrdinalSuffix = (day: number): string => {
      if (day >= 11 && day <= 13) return 'th';
      switch (day % 10) {
        case 1: return 'st';
        case 2: return 'nd';
        case 3: return 'rd';
        default: return 'th';
      }
    };
    
    return `${dayName} ${day}${getOrdinalSuffix(day)} ${month} ${year}`;
  };

  // Update subtitle when event changes
  useEffect(() => {
    if (selectedEvent) {
      setSettings(prev => ({
        ...prev,
        subtitle: `${selectedEvent.name} - ${formatEventDate(selectedEvent.date)}`
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
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    if (!isDataReady || !selectedEvent) return;

    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Import the chart engine to generate SVG
    import('@/lib/tableChartEngine').then(({ generateChartSVG }) => {
      const chartSVG = generateChartSVG(settings, tables, guests, selectedEvent);
      
      // Generate the chart content for printing
      const chartHTML = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Table Seating Chart - ${selectedEvent.name}</title>
            <style>
              @media print {
                @page { 
                  size: A4 portrait;
                  margin: 5mm;
                }
                body { margin: 0; padding: 0; }
              }
              body { 
                font-family: Arial, sans-serif; 
                display: flex; 
                justify-content: center; 
                align-items: center; 
                min-height: 100vh; 
              }
              svg { 
                max-width: 100%; 
                max-height: 100%; 
              }
            </style>
          </head>
          <body>
            ${chartSVG}
          </body>
        </html>
      `;

      printWindow.document.write(chartHTML);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    });
  };

  const isDataReady = selectedEventId && tables.length > 0 && !tablesLoading && !guestsLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="pb-6">
          <div className="flex flex-col gap-4">
            {/* Top Row: Event Selector */}
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

            {/* Event Title Row */}
            {selectedEvent && (
              <div className="flex items-center space-x-2">
                <span className="text-lg font-medium text-foreground">Table Seating Chart for</span>
                <span className="text-lg font-bold text-primary">{selectedEvent.name}</span>
              </div>
            )}

            {/* Main Title Row: Icon, Description, Guest Count, and Buttons */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              {/* Header Icon & Description */}
              <div className="flex items-start gap-3">
                <TableIcon className="w-16 h-16 text-primary flex-shrink-0" />
                <div className="flex flex-col">
                  <CardTitle className="mb-2 text-left">Table Seating Chart</CardTitle>
                  <CardDescription className="text-left">
                    Generate professional seating charts for your venue staff and coordinators
                  </CardDescription>
                  
                  {/* Guest Count and Status Badge */}
                  {selectedEventId && (
                    <div className="flex items-center gap-4 mt-3">
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
                  )}
                </div>
              </div>

              {/* Export and Print Buttons */}
              {isDataReady && (
                <div className="flex gap-2 lg:self-start">
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
          </div>
        </CardHeader>
      </Card>

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