import { Printer as ExportControlsPrinter } from 'lucide-react';
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

import { individualChartCapacityError } from '@/lib/individualTableChartValidation';
import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, TriangleAlert, TableProperties, CalendarDays, Table2, Printer, FileDown, Files, LoaderCircle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import type { Event } from '@/hooks/useEvents';
import { useTables } from '@/hooks/useTables';
import { useRealtimeGuests } from '@/hooks/useRealtimeGuests';
import { format } from 'date-fns';
import { IndividualTableChartPreview } from './IndividualTableChartPreview';
import { IndividualTableChartCustomizer } from './IndividualTableChartCustomizer';
import { IndividualChartStyleSync } from './IndividualChartStyleSync';
import { toast } from '@/hooks/use-toast';
import { normalizeDietaryAccentColor } from '@/lib/dietaryChartSettings';
import type { DietaryAccentColor } from '@/lib/dietaryChartSettings';
import styles from './IndividualTableChartPage.module.css';
export interface IndividualChartSettings {
  tableShape: 'round' | 'square' | 'long';
  fontSize: 'small' | 'medium' | 'large';
  includeNames: boolean;
  includeDietary: boolean;
  includeRelation: boolean;
  includeGuestList: boolean;
  showSeatNumbers: boolean;
  isBold: boolean;
  isItalic: boolean;
  isUnderline: boolean;
  largerTableNames: boolean;
  guestTextSize?: 'small' | 'standard' | 'large';
  guestNameColor: DietaryAccentColor;
  seatNumberColor: DietaryAccentColor;
  guestListColor: DietaryAccentColor;
  dietaryColor: DietaryAccentColor;
  relationshipColor: DietaryAccentColor;
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
  events: Event[];
  eventsLoading: boolean;
  /** Activate only after the matching scoped-save backend is installed and verified. */
  scopedSettingsEnabled?: boolean;
}

const readSession = (key: string) => { try { return sessionStorage.getItem(key); } catch { return null; } };
const writeSession = (key: string, value: string | null) => { try { if(value === null) sessionStorage.removeItem(key); else sessionStorage.setItem(key, value); } catch { /* Keep the page usable when storage is unavailable. */ } };

const defaultSettings: IndividualChartSettings = {
  tableShape: 'round',
  fontSize: 'medium',
  includeNames: true,
  includeDietary: true,
  includeRelation: true,
  includeGuestList: true,
  showSeatNumbers: true,
  isBold: false,
  isItalic: false,
  isUnderline: false,
  largerTableNames: false,
  guestTextSize: 'standard',
  guestNameColor: '#000000',
  seatNumberColor: '#000000',
  guestListColor: '#000000',
  dietaryColor: '#000000',
  relationshipColor: '#000000',
  paperSize: 'A4',
  title: '',
  showLogo: true,
  enableEndSeats: false,
  endSeatsCount: 1,
};

export const IndividualTableSeatingChartPage: React.FC<IndividualTableSeatingChartPageProps> = ({
  selectedEventId,
  onEventSelect,
  events,
  eventsLoading,
  scopedSettingsEnabled = false,
}) => {
  const [selectedTableId, setSelectedTableId] = useState<string | null>(() => {
    return readSession('ww:individual_table_chart_selected_table') || null;
  });
  const [settings, setSettings] = useState<IndividualChartSettings>(() => {
    const stored = readSession('ww:individual_table_chart_settings');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const guestTextSize = ['small', 'standard', 'large'].includes(parsed.guestTextSize)
          ? parsed.guestTextSize
          : 'standard';
        const guestNameColor = normalizeDietaryAccentColor(parsed.guestNameColor);
        const seatNumberColor = normalizeDietaryAccentColor(parsed.seatNumberColor);
        const guestListColor = normalizeDietaryAccentColor(parsed.guestListColor);
        const dietaryColor = normalizeDietaryAccentColor(parsed.dietaryColor);
        const relationshipColor = normalizeDietaryAccentColor(parsed.relationshipColor);
        return { ...defaultSettings, ...parsed, guestTextSize, guestNameColor, seatNumberColor, guestListColor, dietaryColor, relationshipColor };
      } catch {
        return defaultSettings;
      }
    }
    return defaultSettings;
  });
  const [preparedPdf, setPreparedPdf] = useState<{ url: string; name: string } | null>(null);
  const [settingsEditRevision, setSettingsEditRevision] = useState(0);
  useEffect(() => () => { if (preparedPdf) URL.revokeObjectURL(preparedPdf.url); }, [preparedPdf]);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingAll, setIsExportingAll] = useState(false);

  const [showGuestLimitWarning, setShowGuestLimitWarning] = useState(false);

  const { tables, loading: tablesLoading } = useTables(selectedEventId);
  const { guests, loading: guestsLoading } = useRealtimeGuests(selectedEventId);

  // Persist table selection to sessionStorage
  useEffect(() => {
    if (selectedTableId) {
      writeSession('ww:individual_table_chart_selected_table', selectedTableId);
    } else {
      writeSession('ww:individual_table_chart_selected_table', null);
    }
  }, [selectedTableId]);

  // Validate that stored table belongs to current event
  useEffect(() => {
    if (selectedTableId && tables.length > 0 && !tablesLoading) {
      const tableExists = tables.some(table => table.id === selectedTableId);
      if (!tableExists) {
        setSelectedTableId(null);
        writeSession('ww:individual_table_chart_selected_table', null);
      }
    }
  }, [selectedTableId, tables, tablesLoading]);

  // Persist chart settings to sessionStorage
  useEffect(() => {
    writeSession('ww:individual_table_chart_settings', JSON.stringify(settings));
  }, [settings]);

  const selectedEvent = events.find(event => event.id === selectedEventId);
  const selectedTable = tables.find(table => table.id === selectedTableId);

  // Filter guests for selected table
  const tableGuests = guests.filter(g => g.table_id === selectedTableId);

  // Format event date for display
  const eventDate = selectedEvent?.date ? format(new Date(selectedEvent.date), 'PPP') : '';

  // Check if table capacity exceeds limit for round/square shape
  const capacityWarning = useMemo(() => selectedTable ? individualChartCapacityError(settings, selectedTable, guests) : null, [settings, selectedTable, guests]);
  const isTableTooLargeForShape = Boolean(capacityWarning);

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
    setSettingsEditRevision(value => value + 1);
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

    const capacityError = individualChartCapacityError(settings, selectedTable, guests);
    if (capacityError) { toast({ title: 'Export Failed', description: capacityError, variant: 'destructive' }); return; }
    setIsExporting(true);
    try {
      toast({ title: 'Generating PDF', description: 'Creating the selected table chart...' });

      const [{ generateIndividualTableChartPDF }, { savePdfBlobAsync }] = await Promise.all([
        import('@/lib/individualTableChartEngine'),
        import('@/lib/pdfExportUtils'),
      ]);
      const pdfBlob = await generateIndividualTableChartPDF(
        settings,
        selectedTable,
        guests,
        selectedEvent,
        tables.findIndex((table) => table.id === selectedTableId) + 1,
        tables.length
      );

      const eventName = selectedEvent.name.replace(/[<>:"/\\|?*]/g, '');
      const date = new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).replace(/\//g, '-');
      const fileName = `${eventName}-Download Single Page-${date}.pdf`;

      setPreparedPdf({ url: URL.createObjectURL(pdfBlob), name: fileName });
      await savePdfBlobAsync(pdfBlob, fileName);
      toast({ title: 'PDF Downloaded', description: `Page ${tables.findIndex(table => table.id === selectedTableId) + 1} has been saved` });
    } catch (error) {
      console.error('PDF export error:', error);
      toast({ title: 'Export Failed', description: 'Failed to generate PDF', variant: 'destructive' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadAllPdf = async () => {
    if (!selectedEvent || tables.length === 0) return;

    const capacityError = tables.map(table => individualChartCapacityError(settings, table, guests)).find(Boolean);
    if (capacityError) { toast({ title: 'Export Failed', description: capacityError, variant: 'destructive' }); return; }
    setIsExportingAll(true);
    try {
      toast({ title: 'Generating PDF', description: `Creating charts for all ${tables.length} tables...` });

      const [{ generateAllTablesChartPDF }, { savePdfBlobAsync }] = await Promise.all([
        import('@/lib/individualTableChartEngine'),
        import('@/lib/pdfExportUtils'),
      ]);
      const pdfBlob = await generateAllTablesChartPDF(
        settings,
        tables,
        guests,
        selectedEvent
      );

      const eventName = selectedEvent.name.replace(/[<>:"/\\|?*]/g, '');
      const date = new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).replace(/\//g, '-');
      const fileName = `${eventName}-Download All Pages-${date}.pdf`;

      setPreparedPdf({ url: URL.createObjectURL(pdfBlob), name: fileName });
      await savePdfBlobAsync(pdfBlob, fileName);
      toast({ title: 'PDF Downloaded', description: `All ${tables.length} pages have been saved` });
    } catch (error) {
      console.error('PDF export all error:', error);
      toast({ title: 'Export Failed', description: 'Failed to export all pages', variant: 'destructive' });
    } finally {
      setIsExportingAll(false);
    }
  };

  const isDataReady = selectedEvent && selectedTable && !tablesLoading && !guestsLoading;

  return (
    <div className={`${styles.page} space-y-6`}>
      {/* Guest Limit Warning Dialog */}
      <AlertDialog open={showGuestLimitWarning} onOpenChange={setShowGuestLimitWarning}>
        <AlertDialogContent className={styles.dialogPanel}>
          <AlertDialogHeader>
            <AlertDialogTitle className={`${styles.sectionHeading} text-amber-600 flex items-center gap-2`}>
              <TriangleAlert className="w-[18px] h-[18px]" strokeWidth={1.8} />
              Table Has Too Many Guests
            </AlertDialogTitle>
            <AlertDialogDescription className={styles.interfaceText}>
              {capacityWarning}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction className={styles.dialogAction} onClick={() => setShowGuestLimitWarning(false)}>
              OK, I understand
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Event and Table Selection */}
      <Card className={styles.headerPanel}>
        <CardHeader className="space-y-0">
          <div
            data-individual-chart-top-layout="true"
            className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_300px] xl:gap-6 xl:items-stretch"
          >
            <div data-individual-chart-existing-controls="true" className="space-y-4 min-w-0">
              {/* Title and Description */}
              <div>
            <h1 className={`${styles.pageHeading} text-2xl font-bold text-foreground mb-2 flex items-center gap-2`}>
              <TableProperties className="w-6 h-6 shrink-0" strokeWidth={1.8} aria-hidden="true" />
              Individual Table Seating Chart
            </h1>
            <p className={`${styles.pageDescription} text-muted-foreground`}>
              Generate detailed seating charts for individual tables
            </p>
              </div>

              {/* Choose Event + Table dropdowns */}
              <div className={styles.headerSelectors}>
            {/* Choose Event Section */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
              <label className={`${styles.interfaceLabel} text-sm font-medium text-foreground whitespace-nowrap inline-flex items-center gap-[7px]`}>
                <CalendarDays className="w-[17px] h-[17px] shrink-0" strokeWidth={1.8} aria-hidden="true" />
                Choose Event:
              </label>
              <Select
                value={selectedEventId || 'no-event'}
                onValueChange={(value) => {
                  if (value === 'no-event') return;
                  onEventSelect(value);
                  setSelectedTableId(null);
                  writeSession('ww:individual_table_chart_selected_table', null);
                }}
                disabled={eventsLoading || isExporting || isExportingAll}
              >
                <SelectTrigger className={`${styles.selectTrigger} ${styles.headerSelectTrigger} ${styles.interactiveText} w-full sm:w-[300px] font-bold`}>
                  <SelectValue placeholder="Choose Event" />
                </SelectTrigger>
                <SelectContent className={styles.headerSelectMenu}>
                  {events.length > 0 ? (
                    events.map((event) => (
                      <SelectItem className={styles.headerSelectOption} key={event.id} value={event.id}>
                        <div className="flex items-center space-x-2">
                          <CalendarDays className="w-[17px] h-[17px]" strokeWidth={1.8} aria-hidden="true" />
                          <span>{event.name}</span>
                        </div>
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem className={styles.headerSelectOption} value="no-events" disabled>
                      {eventsLoading ? "Loading events..." : "No events found"}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Table Section */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
              <label className={`${styles.interfaceLabel} text-sm font-medium text-foreground whitespace-nowrap inline-flex items-center gap-[7px]`}>
                <Table2 className="w-[17px] h-[17px] shrink-0" strokeWidth={1.8} aria-hidden="true" />
                Choose Table:
              </label>
              <Select
                value={selectedTableId || ''}
                onValueChange={setSelectedTableId}
                disabled={!selectedEventId || tablesLoading}
              >
                <SelectTrigger className={`${styles.selectTrigger} ${styles.headerSelectTrigger} ${styles.compactCounter} w-full sm:w-[300px]`}>
                  <SelectValue placeholder="Select a table" />
                </SelectTrigger>
                <SelectContent className={styles.headerSelectMenu}>
                  {tables.map((table) => (
                    <SelectItem className={styles.headerSelectOption} key={table.id} value={table.id}>
                      {table.name} ({table.guest_count} of {table.limit_seats} guests)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
              </div>
            </div>

            {/* Export Controls */}
            {isDataReady && (
              <div data-export-controls-panel
                data-export-controls-card="true"
                className={`${styles.exportPanel} rounded-xl p-3 sm:p-4 flex flex-col justify-between gap-3 min-w-0`}
              >
                <div className="text-sm flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span data-export-controls-heading><ExportControlsPrinter size={16} strokeWidth={2} aria-hidden="true" />Export Controls</span>

                </div>
                <div className="flex flex-col items-end gap-2 [&>button]:justify-center [&>button]:w-full">
                <button
                  onClick={handleDownloadPdf}
                  disabled={isExporting || isExportingAll}
                  aria-label="Download single page PDF"
                  className={`${styles.exportButton} ww-itc-export-button inline-flex items-center gap-1.5 h-7 px-2.5 text-xs font-medium border-2 rounded-full transition-colors disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2`}
                >
                  {isExporting
                    ? <LoaderCircle className="w-4 h-4 animate-spin text-green-600" strokeWidth={1.8} aria-hidden="true" />
                    : <FileDown className="w-4 h-4 text-green-600" strokeWidth={1.8} aria-hidden="true" />}
                  Download single page PDF
                </button>
                <button
                  onClick={handleDownloadAllPdf}
                  disabled={isExporting || isExportingAll}
                  aria-label="Download all pages PDF"
                  className={`${styles.exportButton} ww-itc-export-button inline-flex items-center gap-1.5 h-7 px-2.5 text-xs font-medium border-2 rounded-full transition-colors disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2`}
                >
                  {isExportingAll
                    ? <LoaderCircle className="w-4 h-4 animate-spin text-green-600" strokeWidth={1.8} aria-hidden="true" />
                    : <Files className="w-4 h-4 text-green-600" strokeWidth={1.8} aria-hidden="true" />}
                  Download all pages PDF
                </button>
                </div>
                {preparedPdf && <p className={styles.interfaceText} style={{ fontSize: '12px' }}>
                  Download not started?{' '}
                  <a href={preparedPdf.url} download={preparedPdf.name} style={{ color: '#166534', textDecoration: 'underline', fontWeight: 600 }}>Save the prepared PDF</a>
                </p>}
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Main Content */}
      {scopedSettingsEnabled && selectedEvent && <IndividualChartStyleSync
        key={`${selectedEvent.user_id}:${selectedEvent.id}`}
        ownerId={selectedEvent.user_id}
        eventId={selectedEvent.id}
        settings={settings}
        editRevision={settingsEditRevision}
        onVerifiedLoad={style => setSettings(previous => ({ ...previous, ...style }))}
      />}
      {!selectedEventId && (
        <Card className={`${styles.emptyPanel} p-8 text-center`}>
          <Users className="w-16 h-16 mx-auto text-primary mb-4" />
          <CardTitle className={`${styles.sectionHeading} mb-2`}>Select an Event</CardTitle>
          <CardDescription className={styles.interfaceText}>
            Choose an event to start creating individual table seating charts
          </CardDescription>
        </Card>
      )}

      {selectedEventId && !selectedTableId && (
        <Card className={`${styles.emptyPanel} p-8 text-center`}>
          <Users className="w-16 h-16 mx-auto text-primary mb-4" />
          <CardTitle className={`${styles.sectionHeading} mb-2`}>Select a Table</CardTitle>
          <CardDescription className={styles.interfaceText}>
            Choose a specific table to generate its seating chart
          </CardDescription>
        </Card>
      )}

      {isDataReady && !isTableTooLargeForShape && (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,3fr)] gap-6 bg-transparent min-w-0">
          {/* Customizer */}
          <div className="min-w-0">
            <IndividualTableChartCustomizer
              isHeadTable={selectedTable?.table_purpose === 'head'}
              settings={settings}
              onSettingsChange={handleSettingsChange}
            />
          </div>

          {/* Preview */}
          <div className={`${styles.previewStage} min-w-0 ww-itc-preview`}>
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
            <Card className={`${styles.warningPanel} p-8 text-center`}>
              <div className="text-amber-600 mb-4">
                <TriangleAlert className="w-16 h-16 mx-auto" strokeWidth={1.8} aria-hidden="true" />
              </div>
              <CardTitle className={`${styles.sectionHeading} mb-2 text-amber-600`}>Table Has Too Many Guests</CardTitle>
              <CardDescription className={`${styles.interfaceText} text-base`}>
                {capacityWarning}
              </CardDescription>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};
