/**
 * ============================================================================
 * 🔒 PRODUCTION LOCKED - DO NOT MODIFY 🔒
 * ============================================================================
 * 
 * ⚠️ THIS COMPONENT IS LOCKED FOR PRODUCTION USE ⚠️
 * 
 * ANY MODIFICATIONS TO THIS FILE REQUIRE EXPLICIT WRITTEN APPROVAL FROM OWNER
 * Unauthorized changes may break critical functionality and print layouts.
 * 
 * Main page component for Full Seating Chart feature. Handles event selection,
 * guest sorting, and coordinates between customizer, preview, and exporter.
 * 
 * CORE FUNCTIONALITY:
 * - Event selection and data loading
 * - Guest sorting (firstName, lastName, tableNo)
 * - Print functionality with helper toast
 * - PDF export coordination
 * - Settings management via custom hook
 * 
 * SORTING OPTIONS:
 * - firstName: Sort by "First Last" alphabetically
 * - lastName: Sort by "Last, First" alphabetically
 * - tableNo: Sort by table number, then first name
 * 
 * LAYOUT:
 * - 4-column grid: 1 col customizer, 3 cols preview
 * - Event selector in header
 * - Action buttons (Print, Download PDF)
 * - Loading states and empty states
 * 
 * Last locked: 2025-10-19
 * Status: PRODUCTION READY - NO CHANGES ALLOWED
 * ============================================================================
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/enhanced-button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ClipboardList, UsersRound, CalendarDays, Printer, FileDown, Files, LoaderCircle, TriangleAlert, LayoutTemplate } from 'lucide-react';
import { useEvents } from '@/hooks/useEvents';
import { useRealtimeGuests } from '@/hooks/useRealtimeGuests';
import { useFullSeatingChartSettings } from '@/hooks/useFullSeatingChartSettings';
import { useTables } from '@/hooks/useTables';

import { useToast } from '@/hooks/use-toast';
import { FullSeatingChartPreview } from './FullSeatingChartPreview';
import { FullSeatingChartCustomizer } from './FullSeatingChartCustomizer';

import { exportFullSeatingChartToPdf } from '@/lib/fullSeatingChartPdfExporter';
import { getFullSeatingChartGuestsPerPage } from '@/lib/fullSeatingChartLayout';
import styles from './FullSeatingChartPage.module.css';

interface FullSeatingChartPageProps {
  selectedEventId: string | null;
  onEventSelect: (eventId: string) => void;
}

export const FullSeatingChartPage: React.FC<FullSeatingChartPageProps> = ({
  selectedEventId,
  onEventSelect
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportTarget, setExportTarget] = useState<'single' | 'all' | null>(null);
  
  const { events, loading: eventsLoading } = useEvents();
  const { guests, loading: guestsLoading } = useRealtimeGuests(selectedEventId);
  const { settings, loading: settingsLoading, updateSettings } = useFullSeatingChartSettings(selectedEventId);
  const { tables } = useTables(selectedEventId);

  // Build a map of table_no -> table name for display
  const tableNameMap = React.useMemo(() => {
    const map: Record<number, string> = {};
    tables.forEach(t => {
      if (t.table_no != null) {
        // Check if the table has a text name (not just a number)
        const isNamedTable = t.name && isNaN(Number(t.name));
        map[t.table_no] = isNamedTable ? t.name : `Table ${t.table_no}`;
      }
    });
    return map;
  }, [tables]);

  // Build a map of table_id -> table display name for guests with table_id but no table_no
  const tableIdNameMap = React.useMemo(() => {
    const map: Record<string, string> = {};
    tables.forEach(t => {
      const isNamedTable = t.name && isNaN(Number(t.name));
      map[t.id] = isNamedTable ? t.name : `Table ${t.table_no}`;
    });
    return map;
  }, [tables]);
  
  const { toast } = useToast();


  const selectedEvent = selectedEventId ? events.find(e => e.id === selectedEventId) : null;

  const handleEventSelect = (eventId: string) => {
    if (eventId === "no-event") return;
    onEventSelect(eventId);
  };

  /**
   * AUTOFIT CALCULATION - Dynamic guests per page based on font size and visible fields
   * Must match the calculation in FullSeatingChartPreview and fullSeatingChartPdfExporter
   */
  const guestsPerPage = getFullSeatingChartGuestsPerPage(settings.fontSize);

  const handleDownloadPdf = async () => {
    if (!selectedEvent) return;
    
    setIsExporting(true);
    setExportTarget('single');
    try {
      toast({
        title: 'Generating PDF',
        description: 'Creating your seating chart...',
      });

      // Calculate current page guests based on auto-fit
      const currentPageIndex = 0; // For single page download, we use first page logic
      const startIdx = currentPageIndex * guestsPerPage;
      const endIdx = Math.min(startIdx + guestsPerPage, sortedGuests.length);
      const currentPageGuests = sortedGuests.slice(startIdx, endIdx);

      await exportFullSeatingChartToPdf(selectedEvent, currentPageGuests, settings, 1, 1, tableNameMap, tableIdNameMap);

      toast({
        title: 'PDF Downloaded',
        description: 'Current page has been saved',
      });
    } catch (error) {
      console.error('PDF export error:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to generate PDF',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
      setExportTarget(null);
    }
  };

  const handleDownloadPdfAll = async () => {
    if (!selectedEvent) return;
    
    setIsExporting(true);
    setExportTarget('all');
    try {
      toast({
        title: 'Generating PDF',
        description: 'Creating your full seating chart...',
      });

      await exportFullSeatingChartToPdf(selectedEvent, sortedGuests, settings, undefined, undefined, tableNameMap, tableIdNameMap);

      toast({
        title: 'PDF Downloaded',
        description: 'Your complete seating chart has been saved',
      });
    } catch (error) {
      console.error('PDF export error:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to generate PDF',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
      setExportTarget(null);
    }
  };

  // Sort guests based on selected sort option from settings
  const sortedGuests = React.useMemo(() => {
    return [...guests].sort((a, b) => {
      if (settings.sortBy === 'firstName') {
        const nameA = `${a.first_name} ${a.last_name || ''}`.trim();
        const nameB = `${b.first_name} ${b.last_name || ''}`.trim();
        return nameA.localeCompare(nameB);
      } else if (settings.sortBy === 'lastName') {
        const lastNameA = (a.last_name || '').trim();
        const lastNameB = (b.last_name || '').trim();
        const firstNameA = (a.first_name || '').trim();
        const firstNameB = (b.first_name || '').trim();
        // Guests without a last name go AFTER guests with a real last name
        if (!lastNameA && lastNameB) return 1;
        if (lastNameA && !lastNameB) return -1;
        const cmp = lastNameA.localeCompare(lastNameB, undefined, { sensitivity: 'base', numeric: true });
        if (cmp !== 0) return cmp;
        return firstNameA.localeCompare(firstNameB, undefined, { sensitivity: 'base', numeric: true });
      } else {
        // sortBy === 'tableNo' — Named tables first (alphabetically), then numbered tables (numerically), then unassigned
        const tableNameA = a.table_no != null ? tableNameMap[a.table_no] : (a.table_id ? tableIdNameMap[a.table_id] : null);
        const tableNameB = b.table_no != null ? tableNameMap[b.table_no] : (b.table_id ? tableIdNameMap[b.table_id] : null);
        const isNamedA = tableNameA ? !tableNameA.startsWith('Table ') : false;
        const isNamedB = tableNameB ? !tableNameB.startsWith('Table ') : false;
        const hasTableA = a.table_no != null || a.table_id != null;
        const hasTableB = b.table_no != null || b.table_id != null;

        // Unassigned goes last
        if (!hasTableA && hasTableB) return 1;
        if (hasTableA && !hasTableB) return -1;
        if (!hasTableA && !hasTableB) return a.first_name.localeCompare(b.first_name);

        // Named tables come before numbered tables
        if (isNamedA && !isNamedB) return -1;
        if (!isNamedA && isNamedB) return 1;

        // Both named: alphabetical
        if (isNamedA && isNamedB) {
          const cmp = tableNameA!.localeCompare(tableNameB!);
          if (cmp !== 0) return cmp;
          return a.first_name.localeCompare(b.first_name);
        }

        // Both numbered: numeric
        const tableA = a.table_no || 0;
        const tableB = b.table_no || 0;
        if (tableA === tableB) {
          return a.first_name.localeCompare(b.first_name);
        }
        return tableA - tableB;
      }
    });
  }, [guests, settings.sortBy, tableNameMap, tableIdNameMap]);

  const isDataReady = selectedEventId && !guestsLoading;
  const hasGuests = guests.length > 0;

  return (
    <div className={`${styles.page} space-y-6 full-seating-chart-dark-purple max-md:px-4`}>
      {/* Header */}
      <Card className={`${styles.headerPanel} border border-[#472c1d] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.15)] print:hidden`}>
        <CardHeader className="space-y-0">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(380px,520px)] xl:gap-6 xl:items-stretch">
            <div className="space-y-4 min-w-0">
              <div className="flex items-start gap-2">
                <ClipboardList className="w-[25px] h-[25px] mt-0.5 text-[#472c1d] shrink-0" strokeWidth={1.8} aria-hidden="true" />
                <div className="min-w-0">
                  <CardTitle className="text-left text-2xl font-bold text-[#472c1d]">Full Seating Chart</CardTitle>
                  <CardDescription className="text-left">
                    Complete guest list with check-off boxes
                  </CardDescription>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 flex-wrap">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
                <label className="text-sm font-medium text-foreground whitespace-nowrap inline-flex items-center gap-[7px]">
                  <CalendarDays className="w-[17px] h-[17px] shrink-0" strokeWidth={1.8} aria-hidden="true" />
                  Choose Event:
                </label>
                <Select value={selectedEventId || "no-event"} onValueChange={handleEventSelect}>
                  <SelectTrigger className={`${styles.selectTrigger} w-full sm:w-[300px] border-[#472c1d] focus:ring-[#472c1d] font-bold text-[#472c1d]`}>
                    <SelectValue placeholder="Choose Event" />
                  </SelectTrigger>
                  <SelectContent className={`${styles.portalSurface} bg-popover border-border z-50`}>
                    {events.length > 0 ? (
                      events.map((event) => (
                        <SelectItem className={styles.portalItem} key={event.id} value={event.id}>
                            <div className="flex items-center gap-2">
                            <CalendarDays className="w-[17px] h-[17px]" strokeWidth={1.8} aria-hidden="true" />
                            <span>{event.name}</span>
                          </div>
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem className={styles.portalItem} value="no-events" disabled>
                        {eventsLoading ? "Loading events..." : "No events found"}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              {selectedEvent && (
                <Badge
                  variant="outline"
                  className={`${styles.statsPill} w-fit max-w-full h-10 px-3 py-2 bg-white border border-[#472c1d] text-[#472c1d] rounded-md whitespace-normal`}
                >
                    <UsersRound className="w-4 h-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />
                    <span className="ml-1.5">
                    {guestsLoading ? "Loading..." : `${guests.length} guests`}
                    </span>
                </Badge>
              )}
              </div>
            </div>

            {/* Export Controls */}
            {isDataReady && hasGuests && (
                <div className={`${styles.exportPanel} bg-white border border-[#472c1d] rounded-xl p-3 sm:p-4 flex flex-col justify-between gap-3 min-w-0`}>
                  <div className="text-sm space-y-1">
                    <span className="font-bold text-sm inline-flex items-center gap-1.5">
                      <Printer className="w-4 h-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />
                      Export Controls
                    </span>
                    <p className="text-muted-foreground">
                      Download the full seating chart and share it with your vendors.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 max-sm:flex-col max-sm:items-stretch">
                    <button
                      className={`${styles.exportButton} ww-itc-export-button inline-flex items-center gap-1.5 h-7 px-2.5 text-xs font-medium border-2 border-green-500 rounded-full text-green-600 bg-background hover:bg-green-50 transition-colors disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2`}
                      onClick={handleDownloadPdf}
                      disabled={isExporting}
                      aria-label="Download single page PDF"
                    >
                      {exportTarget === 'single' ? (
                        <LoaderCircle className="w-4 h-4 animate-spin" strokeWidth={1.8} aria-hidden="true" />
                      ) : (
                        <FileDown className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" />
                      )}
                      Download single page PDF
                    </button>
                    <button
                      className={`${styles.exportButton} ww-itc-export-button inline-flex items-center gap-1.5 h-7 px-2.5 text-xs font-medium border-2 border-green-500 rounded-full text-green-600 bg-background hover:bg-green-50 transition-colors disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2`}
                      onClick={handleDownloadPdfAll}
                      disabled={isExporting}
                      aria-label="Download all pages PDF"
                    >
                      {exportTarget === 'all' ? (
                        <LoaderCircle className="w-4 h-4 animate-spin" strokeWidth={1.8} aria-hidden="true" />
                      ) : (
                        <Files className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" />
                      )}
                      Download all pages PDF
                    </button>
                  </div>
                </div>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Main Content */}
      {selectedEventId ? (
        isDataReady && hasGuests ? (
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,3fr)] gap-6 max-lg:px-2">
            {/* Customization Panel */}
            <div className="min-w-0">
              <FullSeatingChartCustomizer
                settings={settings}
                onSettingsChange={updateSettings}
              />
            </div>

            {/* Preview */}
            <div className="min-w-0">
              <div className="lg:hidden overflow-x-auto -mx-2 px-2 pb-2">
                <div className="min-w-[820px] flex justify-center">
                  <FullSeatingChartPreview 
                    event={selectedEvent!} 
                    guests={sortedGuests}
                    settings={settings}
                    tableNameMap={tableNameMap}
                    tableIdNameMap={tableIdNameMap}
                  />
                </div>
              </div>
              <div className="hidden lg:block">
                <FullSeatingChartPreview 
                  event={selectedEvent!} 
                  guests={sortedGuests}
                  settings={settings}
                  tableNameMap={tableNameMap}
                  tableIdNameMap={tableIdNameMap}
                />
              </div>
            </div>
          </div>
        ) : isDataReady && !hasGuests ? (
          <Card className={`${styles.emptyPanel} ww-box print:hidden`}>
            <CardContent className="p-8 text-center">
              <UsersRound className="w-16 h-16 mx-auto text-muted-foreground mb-4" strokeWidth={1.8} aria-hidden="true" />
              <CardTitle className="mb-2">No Guests Found</CardTitle>
              <CardDescription>
                Add some guests to generate your seating chart.
              </CardDescription>
            </CardContent>
          </Card>
        ) : (
          <Card className={`${styles.emptyPanel} ww-box print:hidden`}>
            <CardContent className="p-8 text-center">
              <LayoutTemplate className="w-16 h-16 mx-auto text-muted-foreground mb-4" strokeWidth={1.8} aria-hidden="true" />
              <CardTitle className="mb-2">Loading Event Data</CardTitle>
              <CardDescription>
                Please wait while we load your guest information.
              </CardDescription>
            </CardContent>
          </Card>
        )
      ) : (
        <Card className={`${styles.emptyPanel} ww-box print:hidden`}>
          <CardContent className="p-8 text-center">
            <ClipboardList className="w-16 h-16 mx-auto text-muted-foreground mb-4" strokeWidth={1.8} aria-hidden="true" />
            <CardTitle className="mb-2">Select an Event</CardTitle>
            <CardDescription>
              Choose an event from the dropdown above to generate your full seating chart
            </CardDescription>
          </CardContent>
        </Card>
      )}

    </div>
  );
};
