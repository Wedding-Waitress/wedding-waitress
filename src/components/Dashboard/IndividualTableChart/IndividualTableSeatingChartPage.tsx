/**
 * ⚠️ PRODUCTION-READY - DO NOT MODIFY WITHOUT APPROVAL ⚠️
 * 
 * This Individual Table Charts feature is COMPLETE and LOCKED.
 * All functionality has been thoroughly tested and approved.
 * 
 * DO NOT make changes unless explicitly requested by the project owner.
 * Any modifications could break the carefully calibrated A4 export system,
 * seat positioning algorithms, and multi-table PDF generation.
 * 
 * Last completed: 2025-10-04
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, FileText } from 'lucide-react';
import { useEvents } from '@/hooks/useEvents';
import { useTables } from '@/hooks/useTables';
import { useRealtimeGuests } from '@/hooks/useRealtimeGuests';
import { format } from 'date-fns';
import { IndividualTableChartPreview } from './IndividualTableChartPreview';
import { IndividualTableChartCustomizer } from './IndividualTableChartCustomizer';
import { generateIndividualTableChartPDF, generateAllTablesChartPDF } from '@/lib/individualTableChartEngine';
import { saveAs } from 'file-saver';
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
  totalTables?: number;
  currentTableIndex?: number;
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

  const { events, loading: eventsLoading } = useEvents();
  const { tables, loading: tablesLoading } = useTables(selectedEventId);
  const { guests, loading: guestsLoading } = useRealtimeGuests(selectedEventId);

  const selectedEvent = events.find(event => event.id === selectedEventId);
  const selectedTable = tables.find(table => table.id === selectedTableId);

  // Format event date for display
  const eventDate = selectedEvent?.date ? format(new Date(selectedEvent.date), 'PPP') : '';

  // Update chart title when event or table changes
  useEffect(() => {
    if (selectedEvent && selectedTableId) {
      const table = tables.find(table => table.id === selectedTableId);
      if (table) {
        setSettings(prev => ({
          ...prev,
          title: `TABLE ${table.table_no || 'Unknown'}`
        }));
      }
    }
  }, [selectedEvent, selectedTableId, tables]);

  const handleSettingsChange = (newSettings: Partial<IndividualChartSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  // Format event name: capitalize each word, single hyphen
  const formatEventNameForFile = (name: string): string => {
    return name
      .split(/[^a-zA-Z0-9]+/)
      .filter(word => word.length > 0)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('-');
  };

  const handleDownloadPdf = async () => {
    if (!selectedEvent || !selectedTableId || !selectedTable) return;
    
    setIsExporting(true);
    try {
      toast.info('Generating PDF...');
      
      const pdfBlob = await generateIndividualTableChartPDF(
        settings,
        selectedTable,
        guests,
        selectedEvent
      );
      
      const eventName = formatEventNameForFile(selectedEvent.name);
      const tableIdentifier = selectedTable.table_no ?? selectedTable.name;
      const date = new Date().toLocaleDateString('en-GB', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      }).replace(/\//g, '-');
      const fileName = `${eventName}-Table-${tableIdentifier}-Seating-Chart-${date}.pdf`;
      
      saveAs(pdfBlob, fileName);
      toast.success('PDF downloaded successfully!');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadAllPdf = async () => {
    if (!selectedEvent || tables.length === 0) return;
    
    setIsExportingAll(true);
    try {
      toast.info(`Generating PDF for ${tables.length} tables...`);
      
      const pdfBlob = await generateAllTablesChartPDF(
        settings,
        tables,
        guests,
        selectedEvent
      );
      
      const eventName = formatEventNameForFile(selectedEvent.name);
      const date = new Date().toLocaleDateString('en-GB', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      }).replace(/\//g, '-');
      const fileName = `${eventName}-All-Tables-Seating-Charts-${date}.pdf`;
      
      saveAs(pdfBlob, fileName);
      toast.success(`Successfully exported ${tables.length} tables to PDF!`);
    } catch (error) {
      console.error('PDF export all error:', error);
      toast.error('Failed to export all tables');
    } finally {
      setIsExportingAll(false);
    }
  };

  const isDataReady = selectedEvent && selectedTable && !tablesLoading && !guestsLoading;

  return (
    <div className="space-y-6">
      {/* Event and Table Selection */}
      <Card className="ww-box">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            {/* Left: Title and Description */}
            <div>
              <h1 className="text-2xl font-medium text-[#7248e6] mb-2">
                Individual Table Seating Chart
              </h1>
              <p className="text-muted-foreground">
                Generate detailed seating charts for individual tables
              </p>
            </div>
            
            {/* Right: Export Controls Box */}
            {isDataReady && (
              <div className="border border-primary rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-medium">Export Controls</h3>
                <p className="text-muted-foreground text-sm">
                  For best results, save the PDF to a file and print directly.
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button 
                    variant="default"
                    size="xs"
                    onClick={handleDownloadPdf}
                    disabled={isExporting || isExportingAll}
                    className="rounded-full flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    Download PDF
                  </Button>
                  <Button 
                    variant="default"
                    size="xs"
                    onClick={handleDownloadAllPdf}
                    disabled={isExporting || isExportingAll}
                    className="rounded-full flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    {isExportingAll ? `Exporting ${tables.length} tables...` : 'Download All PDF'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-8">
          <div className="flex items-center gap-8 flex-wrap">
            {/* Choose Event Section */}
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-foreground whitespace-nowrap">
                Choose Event:
              </label>
              <Select
                value={selectedEventId || 'no-event'} 
                onValueChange={(value) => {
                  if (value === 'no-event') return;
                  onEventSelect(value);
                }}
                disabled={eventsLoading}
              >
                <SelectTrigger className="w-[300px] border-primary focus:ring-primary font-bold text-[#7248e6]">
                  <SelectValue placeholder="Choose Event" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border z-50">
                  {events.length > 0 ? (
                    events.map((event) => (
                      <SelectItem key={event.id} value={event.id}>
                        <div className="flex items-center space-x-2">
                          <Users className="w-4 h-4" />
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

            {/* Table Section */}
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-foreground whitespace-nowrap">
                Table:
              </label>
              <Select 
                value={selectedTableId || ''} 
                onValueChange={setSelectedTableId}
                disabled={!selectedEventId || tablesLoading}
              >
                <SelectTrigger className="w-[300px] border-primary focus:ring-primary">
                  <SelectValue placeholder="Select a table" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border z-50">
                  {tables.map((table) => (
                    <SelectItem key={table.id} value={table.id}>
                      Table {table.table_no} - {table.name} ({table.guest_count}/{table.limit_seats} guests)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
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
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 bg-transparent">
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
              totalTables={tables.length}
              currentTableIndex={tables.findIndex(t => t.id === selectedTableId) + 1}
            />
          </div>
        </div>
      )}
    </div>
  );
};
