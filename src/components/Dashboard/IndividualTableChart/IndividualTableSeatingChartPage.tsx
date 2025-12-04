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
import { Users, FileText, Move, AlertTriangle } from 'lucide-react';
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
import { useLongTableArrangement } from '@/hooks/useLongTableArrangement';
import { format } from 'date-fns';
import { IndividualTableChartPreview } from './IndividualTableChartPreview';
import { IndividualTableChartCustomizer } from './IndividualTableChartCustomizer';
import { LongTableArrangementModal } from './LongTableArrangementModal';
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
  endSeatsCount: 1 | 2;
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
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [settings, setSettings] = useState<IndividualChartSettings>(defaultSettings);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingAll, setIsExportingAll] = useState(false);
  const [isArrangementModalOpen, setIsArrangementModalOpen] = useState(false);
  const [longTableSuggestionShown, setLongTableSuggestionShown] = useState<Set<string>>(new Set());
  const [showGuestLimitWarning, setShowGuestLimitWarning] = useState(false);

  const { events, loading: eventsLoading } = useEvents();
  const { tables, loading: tablesLoading } = useTables(selectedEventId);
  const { guests, loading: guestsLoading } = useRealtimeGuests(selectedEventId);
  
  // Long table arrangement hook
  const { 
    getArrangedGuests, 
    saveArrangements, 
    resetToDefault 
  } = useLongTableArrangement(selectedEventId, selectedTableId);

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
  
  // Auto-detect: Suggest Long Table for tables with 25+ guests
  useEffect(() => {
    if (selectedTable && tableGuests.length >= 25 && settings.tableShape !== 'long') {
      const suggestionKey = `${selectedTableId}-${tableGuests.length}`;
      if (!longTableSuggestionShown.has(suggestionKey)) {
        setLongTableSuggestionShown(prev => new Set([...prev, suggestionKey]));
        toast.info(
          `This table has ${tableGuests.length} guests. Would you like to use the Long Table layout?`,
          {
            action: {
              label: 'Switch to Long Table',
              onClick: () => handleSettingsChange({ tableShape: 'long' })
            },
            duration: 8000
          }
        );
      }
    }
  }, [selectedTableId, tableGuests.length, settings.tableShape]);

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

  // Get arranged guests for long table
  const arrangedGuests = settings.tableShape === 'long' ? getArrangedGuests(tableGuests) : [];

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

      {/* Long Table Arrangement Modal */}
      <LongTableArrangementModal
        isOpen={isArrangementModalOpen}
        onClose={() => setIsArrangementModalOpen(false)}
        guests={tableGuests}
        initialArrangement={arrangedGuests}
        onSave={saveArrangements}
        onReset={resetToDefault}
        tableName={`Table ${selectedTable?.table_no ?? selectedTable?.name ?? 'Unknown'}`}
      />
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
                  {settings.tableShape === 'long' && (
                    <Button 
                      variant="outline"
                      size="xs"
                      onClick={() => setIsArrangementModalOpen(true)}
                      className="rounded-full flex items-center gap-2"
                    >
                      <Move className="w-4 h-4" />
                      Arrange Seats
                  </Button>
                  )}
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
                      Table {table.table_no ? `Table ${table.table_no}` : table.name} ({table.guest_count} of {table.limit_seats} guests)
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
