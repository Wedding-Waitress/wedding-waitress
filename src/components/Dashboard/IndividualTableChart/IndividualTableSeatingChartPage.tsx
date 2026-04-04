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

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, FileText, AlertTriangle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
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
  tableShape: 'round' | 'square' | 'long';
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
  // Long Table End Seats Options
  enableEndSeats: boolean;
  endSeatsCount: 1; // Always 1 seat per end (removed 2-seat option)
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
  enableEndSeats: false,
  endSeatsCount: 1,
};

export const IndividualTableSeatingChartPage: React.FC<IndividualTableSeatingChartPageProps> = ({
  selectedEventId,
  onEventSelect,
}) => {
  const [selectedTableId, setSelectedTableId] = useState<string | null>(() => {
    return sessionStorage.getItem('ww:individual_table_chart_selected_table') || null;
  });
  const [settings, setSettings] = useState<IndividualChartSettings>(() => {
    const stored = sessionStorage.getItem('ww:individual_table_chart_settings');
    if (stored) {
      try {
        return { ...defaultSettings, ...JSON.parse(stored) };
      } catch {
        return defaultSettings;
      }
    }
    return defaultSettings;
  });
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingAll, setIsExportingAll] = useState(false);
  
  const [showGuestLimitWarning, setShowGuestLimitWarning] = useState(false);

  const { events, loading: eventsLoading } = useEvents();
  const { tables, loading: tablesLoading } = useTables(selectedEventId);
  const { guests, loading: guestsLoading } = useRealtimeGuests(selectedEventId);

  // Persist table selection to sessionStorage
  useEffect(() => {
    if (selectedTableId) {
      sessionStorage.setItem('ww:individual_table_chart_selected_table', selectedTableId);
    } else {
      sessionStorage.removeItem('ww:individual_table_chart_selected_table');
    }
  }, [selectedTableId]);

  // Validate that stored table belongs to current event
  useEffect(() => {
    if (selectedTableId && tables.length > 0 && !tablesLoading) {
      const tableExists = tables.some(table => table.id === selectedTableId);
      if (!tableExists) {
        setSelectedTableId(null);
        sessionStorage.removeItem('ww:individual_table_chart_selected_table');
      }
    }
  }, [selectedTableId, tables, tablesLoading]);

  // Persist chart settings to sessionStorage
  useEffect(() => {
    sessionStorage.setItem('ww:individual_table_chart_settings', JSON.stringify(settings));
  }, [settings]);

  const selectedEvent = events.find(event => event.id === selectedEventId);
  const selectedTable = tables.find(table => table.id === selectedTableId);

  // Filter guests for selected table
  const tableGuests = guests.filter(g => g.table_id === selectedTableId);

  // Format event date for display
  const eventDate = selectedEvent?.date ? format(new Date(selectedEvent.date), 'PPP') : '';

  // Check if table capacity exceeds limit for round/square shape
  const isTableTooLargeForShape = useMemo(() => {
    const tableCapacity = selectedTable?.limit_seats || 0;
    return (settings.tableShape === 'round' || settings.tableShape === 'square') 
      && tableCapacity > 20;
  }, [settings.tableShape, selectedTable?.limit_seats]);

  // Show warning when table is too large for selected shape
  useEffect(() => {
    if (isTableTooLargeForShape && selectedTableId) {
      setShowGuestLimitWarning(true);
    }
  }, [isTableTooLargeForShape, selectedTableId]);
  

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
      {/* Guest Limit Warning Dialog */}
      <AlertDialog open={showGuestLimitWarning} onOpenChange={setShowGuestLimitWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-amber-600 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Table Has Too Many Guests
            </AlertDialogTitle>
            <AlertDialogDescription>
              To view a table that has 20+ guests, please choose the <strong>Long Table</strong> option in the Chart Settings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowGuestLimitWarning(false)}>
              OK, I understand
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Event and Table Selection */}
      <Card className="border border-primary shadow-[0_4px_20px_-4px_rgba(0,0,0,0.15)]">
        <CardHeader className="space-y-4">
          {/* Title and Description */}
          <div>
            <h1 className="text-2xl font-medium text-foreground mb-2">
              Individual Table Seating Chart
            </h1>
            <p className="text-muted-foreground">
              Generate detailed seating charts for individual tables
            </p>
          </div>

          {/* Choose Event + Table dropdowns */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8 flex-wrap">
            {/* Choose Event Section */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
              <label className="text-sm font-medium text-foreground whitespace-nowrap">
                Choose Event:
              </label>
              <Select
                value={selectedEventId || 'no-event'} 
                onValueChange={(value) => {
                  if (value === 'no-event') return;
                  onEventSelect(value);
                  setSelectedTableId(null);
                  sessionStorage.removeItem('ww:individual_table_chart_selected_table');
                }}
                disabled={eventsLoading}
              >
                <SelectTrigger className="w-full sm:w-[300px] border-primary focus:ring-primary font-bold text-[#7248e6]">
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
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
              <label className="text-sm font-medium text-foreground whitespace-nowrap">
                Choose Table:
              </label>
              <Select 
                value={selectedTableId || ''} 
                onValueChange={setSelectedTableId}
                disabled={!selectedEventId || tablesLoading}
              >
                <SelectTrigger className="w-full sm:w-[300px] border-primary focus:ring-primary">
                  <SelectValue placeholder="Select a table" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border z-50">
                  {tables.map((table) => (
                    <SelectItem key={table.id} value={table.id}>
                      {table.name} ({table.guest_count} of {table.limit_seats} guests)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Export Controls */}
          {isDataReady && (
            <div className="border border-primary rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-sm">
                <span className="font-bold">Export Controls</span>
                {' '}Download & share your individual table charts with your venue.
              </p>
              <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                <button 
                  onClick={handleDownloadPdf}
                  disabled={isExporting || isExportingAll}
                  className="inline-flex items-center gap-2 h-7 px-2.5 text-xs font-medium border-2 border-green-500 rounded-full text-green-600 bg-background hover:bg-green-50 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                >
                  <FileText className="w-3 h-3" />
                  Download single page PDF
                </button>
                <button 
                  onClick={handleDownloadAllPdf}
                  disabled={isExporting || isExportingAll}
                  className="inline-flex items-center gap-2 h-7 px-2.5 text-xs font-medium border-2 border-green-500 rounded-full text-green-600 bg-background hover:bg-green-50 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                >
                  <FileText className="w-3 h-3" />
                  {isExportingAll ? `Exporting ${tables.length} tables...` : 'Download all pages PDF'}
                </button>
              </div>
            </div>
          )}
        </CardHeader>
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

      {isDataReady && !isTableTooLargeForShape && (
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

      {isDataReady && isTableTooLargeForShape && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 bg-transparent">
          {/* Customizer - still visible so user can change to Long Table */}
          <div className="lg:col-span-1">
            <IndividualTableChartCustomizer
              settings={settings}
              onSettingsChange={handleSettingsChange}
            />
          </div>

          {/* Warning Message */}
          <div className="lg:col-span-3">
            <Card className="ww-box p-8 text-center">
              <div className="text-amber-600 mb-4">
                <AlertTriangle className="w-16 h-16 mx-auto" />
              </div>
              <CardTitle className="mb-2 text-amber-600">Table Has Too Many Guests</CardTitle>
              <CardDescription className="text-base">
                This table has a capacity of {selectedTable?.limit_seats || 0} guests. Round and Square tables can only display up to 20 guests.
                <br /><br />
                Please select <strong>Long Table</strong> in Chart Settings to view this table.
              </CardDescription>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};
