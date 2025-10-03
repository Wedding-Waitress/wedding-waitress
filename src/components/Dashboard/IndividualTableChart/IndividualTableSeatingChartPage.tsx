import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Users, FileDown, Printer, Settings } from 'lucide-react';
import { useEvents } from '@/hooks/useEvents';
import { useTables } from '@/hooks/useTables';
import { useRealtimeGuests } from '@/hooks/useRealtimeGuests';
import { format } from 'date-fns';
import { IndividualTableChartPreview } from './IndividualTableChartPreview';
import { IndividualTableChartCustomizer } from './IndividualTableChartCustomizer';
import { IndividualTableChartExporter } from './IndividualTableChartExporter';
import { generateIndividualTableSVG, generateAllTablesChartPDF } from '@/lib/individualTableChartEngine';
import { toast } from 'sonner';

export interface IndividualChartSettings {
  tableShape: 'round' | 'square';
  fontSize: 'small' | 'medium' | 'large';
  includeNames: boolean;
  includeDietary: boolean;
  includeGuestList: boolean;
  showSeatNumbers: boolean;
  paperSize: 'A4';
  title: string;
  showLogo: boolean;
}

interface IndividualTableSeatingChartPageProps {
  selectedEventId: string | null;
  onEventSelect: (eventId: string) => void;
}

const defaultSettings: IndividualChartSettings = {
  tableShape: 'round',
  fontSize: 'medium',
  includeNames: true,
  includeDietary: true,
  includeGuestList: true,
  showSeatNumbers: true,
  paperSize: 'A4',
  title: '',
  showLogo: true,
};

export const IndividualTableSeatingChartPage: React.FC<IndividualTableSeatingChartPageProps> = ({
  selectedEventId,
  onEventSelect,
}) => {
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [settings, setSettings] = useState<IndividualChartSettings>(defaultSettings);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingAll, setIsExportingAll] = useState(false);
  const [showExporter, setShowExporter] = useState(false);

  const { events, loading: eventsLoading } = useEvents();
  const { tables, loading: tablesLoading } = useTables(selectedEventId);
  const { guests, loading: guestsLoading } = useRealtimeGuests(selectedEventId);

  const selectedEvent = events.find(event => event.id === selectedEventId);

  // Format event date for display
  const eventDate = selectedEvent?.date ? format(new Date(selectedEvent.date), 'PPP') : '';

  // Update chart title when event or table changes
  useEffect(() => {
    if (selectedEvent && selectedTableId) {
      const selectedTable = tables.find(table => table.id === selectedTableId);
      if (selectedTable) {
        setSettings(prev => ({
          ...prev,
          title: `TABLE ${selectedTable.table_no || 'Unknown'}`
        }));
      }
    }
  }, [selectedEvent, selectedTableId, tables]);

  const handleSettingsChange = (newSettings: Partial<IndividualChartSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const handleExport = async (format: 'pdf' | 'png' | 'jpg') => {
    if (!selectedEvent || !selectedTableId) return;
    
    setIsExporting(true);
    try {
      // Export logic will be implemented in the exporter component
      setShowExporter(true);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      // Focus on the print container to ensure clean printing
      const printContainer = document.getElementById('printA4-individual-table');
      if (printContainer) {
        window.print();
      }
    }
  };

  const handlePrintAll = () => {
    if (!selectedEvent || tables.length === 0) return;

    // Generate HTML for all tables
    const allTablesHTML = tables.map(table => {
      const tableGuests = guests.filter(guest => guest.table_id === table.id);
      const tableSettings = {
        ...settings,
        title: `TABLE ${table.table_no || 'Unknown'}`
      };
      return generateIndividualTableSVG(tableSettings, table, tableGuests, selectedEvent);
    }).join('');

    // Create print window with all tables
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>All Tables - ${selectedEvent.name}</title>
            <style>
              body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
              .page { page-break-after: always; }
              .page:last-child { page-break-after: avoid; }
              @media print {
                .page { page-break-after: always; }
                .page:last-child { page-break-after: avoid; }
              }
            </style>
          </head>
          <body>
            ${tables.map((table, index) => {
              const tableGuests = guests.filter(guest => guest.table_id === table.id);
              const tableSettings = {
                ...settings,
                title: `TABLE ${table.table_no || 'Unknown'}`
              };
              const isLastTable = index === tables.length - 1;
              return `<div class="page${isLastTable ? ' last-page' : ''}">${generateIndividualTableSVG(tableSettings, table, tableGuests, selectedEvent)}</div>`;
            }).join('')}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  };

  const handleExportAllTables = async () => {
    if (!selectedEvent || tables.length === 0) return;

    setIsExportingAll(true);
    try {
      toast.info(`Generating PDF for ${tables.length} tables...`);
      
      const blob = await generateAllTablesChartPDF(settings, tables, guests, selectedEvent);
      
      // Create download
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${selectedEvent.name}-All-Tables-Seating-Charts-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success(`Successfully exported ${tables.length} tables to PDF!`);
    } catch (error) {
      console.error('Export all tables failed:', error);
      toast.error('Failed to export all tables. Please try again.');
    } finally {
      setIsExportingAll(false);
    }
  };

  const selectedTable = tables.find(table => table.id === selectedTableId);
  const isDataReady = selectedEvent && selectedTable && !tablesLoading && !guestsLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text mb-2">Individual Table Seating Chart</h1>
          <p className="text-muted-foreground">
            Generate detailed seating charts for individual tables
          </p>
        </div>
      </div>

      {/* Event and Table Selection */}
      <Card className="ww-box">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Selection & Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Event</label>
              <Select 
                value={selectedEventId || ''} 
                onValueChange={onEventSelect}
                disabled={eventsLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an event" />
                </SelectTrigger>
                <SelectContent>
                  {events.map((event) => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.name} - {event.date ? format(new Date(event.date), 'MMM dd, yyyy') : 'No date'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Table</label>
              <Select 
                value={selectedTableId || ''} 
                onValueChange={setSelectedTableId}
                disabled={!selectedEventId || tablesLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a table" />
                </SelectTrigger>
                <SelectContent>
                  {tables.map((table) => (
                    <SelectItem key={table.id} value={table.id}>
                      Table {table.table_no} - {table.name} ({table.guest_count}/{table.limit_seats} guests)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Action Buttons */}
          {isDataReady && (
            <div className="flex items-center gap-2 pt-4 border-t">
              <Button 
                onClick={() => handleExport('pdf')} 
                disabled={isExporting || isExportingAll}
                className="flex items-center gap-2"
              >
                <FileDown className="w-4 h-4" />
                Export PDF
              </Button>
              <Button 
                onClick={handleExportAllTables}
                disabled={isExporting || isExportingAll}
                className="flex items-center gap-2"
              >
                <FileDown className="w-4 h-4" />
                {isExportingAll ? 'Exporting...' : 'Export All Tables'}
              </Button>
              <Button 
                variant="outline" 
                onClick={handlePrint}
                className="flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                Print
              </Button>
              <Button 
                variant="outline" 
                onClick={handlePrintAll}
                className="flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                Print All Tables
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Content */}
      {!selectedEventId && (
        <Card className="ww-box p-8 text-center">
          <Users className="w-16 h-16 mx-auto text-primary mb-4" />
          <CardTitle className="mb-2">Select an Event</CardTitle>
          <CardDescription>
            Choose an event to start creating individual table seating charts
          </CardDescription>
        </Card>
      )}

      {selectedEventId && !selectedTableId && (
        <Card className="ww-box p-8 text-center">
          <Users className="w-16 h-16 mx-auto text-primary mb-4" />
          <CardTitle className="mb-2">Select a Table</CardTitle>
          <CardDescription>
            Choose a specific table to generate its seating chart
          </CardDescription>
        </Card>
      )}

      {isDataReady && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Customizer */}
          <div className="lg:col-span-1">
            <IndividualTableChartCustomizer
              settings={settings}
              onSettingsChange={handleSettingsChange}
            />
          </div>

          {/* Preview */}
          <div className="lg:col-span-3">
            <IndividualTableChartPreview
              settings={settings}
              table={selectedTable}
              guests={guests}
              event={selectedEvent}
            />
          </div>
        </div>
      )}

      {/* Exporter Modal */}
      {showExporter && selectedEvent && selectedTable && (
        <IndividualTableChartExporter
          settings={settings}
          table={selectedTable}
          guests={guests}
          event={selectedEvent}
          onClose={() => setShowExporter(false)}
        />
      )}
    </div>
  );
};