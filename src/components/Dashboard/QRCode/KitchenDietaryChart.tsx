import { Printer as ExportControlsPrinter } from 'lucide-react';
/**
 * PRODUCTION-READY -- LOCKED FOR PRODUCTION
 *
 * The QR Code Seating Chart feature is COMPLETE and APPROVED for production use.
 *
 * CRITICAL RULES:
 * - DO NOT modify without explicit owner approval
 * - Changes could break QR code generation and customisation
 * - Changes could break the guest lookup link system
 * - Changes could break real-time event syncing
 *
 * Last locked: 2026-02-19
 *
 * ⚠️ Previously locked: 2025-10-04
 * Contains: Kitchen dietary requirements chart with PDF export and print functionality
 * Status: Fully tested and production-ready
 * Features: Dietary requirements display, PDF export with custom spacing, print view, Wedding Waitress branding
 */

import React, { useState, useMemo } from 'react';
import { flushSync } from 'react-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChefHat, ChevronLeft, ChevronRight, CalendarDays, UtensilsCrossed, Printer, FileDown, Files, LoaderCircle, TriangleAlert } from 'lucide-react';
import { useRealtimeGuests } from '@/hooks/useRealtimeGuests';
import { useTables } from '@/hooks/useTables';
import { useDietaryChartSettings } from '@/hooks/useDietaryChartSettings';
import { DietaryChartCustomizer } from './DietaryChartCustomizer';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
const dietaryLogo = '/wedding-waitress-logo-brown.png';
import { computeRelationDisplay } from '@/lib/relationUtils';
import type { RelationPartner, RelationRole } from '@/lib/relationUtils';
import { Event } from '@/hooks/useEvents';
import { chunkDietaryGuests, packDietaryGuestPages, DIETARY_GUEST_TEXT_SIZES } from '@/lib/dietaryChartSettings';
import { DIETARY_A4_LAYOUT, DIETARY_REPORT_TEXT_COLOR } from '@/lib/dietaryChartA4Layout';
import premiumStyles from '../Signage/SignagePage.module.css';
import styles from './KitchenDietaryChartPage.module.css';

interface KitchenDietaryChartProps {
  eventId: string | null;
  onEventSelect?: (eventId: string) => void;
  events: Event[];
}

interface DietaryGuest {
  id: string;
  first_name: string;
  last_name: string;
  table_no: number | null;
  table_id: string | null;
  table_display: string;
  seat_no: number | null;
  dietary: string;
  relation_partner: RelationPartner;
  relation_role: RelationRole;
  mobile: string | null;
}

export const KitchenDietaryChart: React.FC<KitchenDietaryChartProps> = ({ eventId, onEventSelect, events }) => {
  const { guests, loading: guestsLoading } = useRealtimeGuests(eventId);
  const { tables, loading: tablesLoading } = useTables(eventId);
  const { settings, loading: settingsLoading, updateSettings } = useDietaryChartSettings(eventId);
  const [isExporting, setIsExporting] = useState(false);
  const [exportTarget, setExportTarget] = useState<'single' | 'all' | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();

  const currentEvent = events.find(event => event.id === eventId);

  const handleEventSelect = (newEventId: string) => {
    if (newEventId === "no-event") return;
    onEventSelect?.(newEventId);
  };

  // Date formatting helpers
  const getOrdinalSuffix = (day: number) => {
    if (day > 3 && day < 21) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };

  const formatDateWithOrdinal = (dateString: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      const day = date.getDate();
      const ordinal = getOrdinalSuffix(day);
      const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
      const month = date.toLocaleDateString('en-US', { month: 'long' });
      const year = date.getFullYear();
      return `${weekday} ${day}${ordinal}, ${month} ${year}`;
    } catch {
      return dateString;
    }
  };

  const generatedAt = React.useMemo(() => new Date(), [eventId, guests, tables, settings]);
  const formatGeneratedTimestamp = () => {
    const now = generatedAt;
    const dateStr = now.toLocaleDateString('en-GB');
    const timeStr = now.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    return `${dateStr} ${timeStr}`;
  };

  const formatTimeDisplay = (time: string | null | undefined): string => {
    if (!time) return 'TBD';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // Filter guests with dietary requirements (not 'NA', not empty, and not null)
  const dietaryGuests = useMemo(() => {
    const filtered = guests
      .filter(guest =>
        guest.dietary &&
        guest.dietary.trim() !== '' &&
        !['na', 'n/a', 'none'].includes(guest.dietary.trim().toLowerCase()) &&
        guest.dietary.toLowerCase() !== 'none'
      )
      .map(guest => {
        // Look up table name from tables array
        const matchedTable = guest.table_id ? tables.find(t => t.id === guest.table_id) : null;
        const tableDisplay = matchedTable
          ? (matchedTable.table_no ? String(matchedTable.table_no) : matchedTable.name)
          : (guest.table_no ? String(guest.table_no) : '-');
        return {
          id: guest.id,
          first_name: guest.first_name,
          last_name: guest.last_name,
          table_no: matchedTable?.table_no ?? guest.table_no,
          table_id: guest.table_id || null,
          table_display: tableDisplay,
          seat_no: guest.seat_no,
          dietary: guest.dietary.trim(),
          relation_partner: guest.relation_partner as RelationPartner,
          relation_role: guest.relation_role as RelationRole,
          mobile: guest.mobile
        };
      });

    // Apply sorting based on settings
    return filtered.sort((a, b) => {
      if (settings.sortBy === 'tableNo') {
        if (a.table_no !== b.table_no) {
          return (a.table_no || 999) - (b.table_no || 999);
        }
        return a.first_name.localeCompare(b.first_name);
      } else if (settings.sortBy === 'lastName') {
        const lastNameA = a.last_name || '';
        const lastNameB = b.last_name || '';
        if (lastNameA !== lastNameB) {
          return lastNameA.localeCompare(lastNameB);
        }
        return a.first_name.localeCompare(b.first_name);
      } else if (settings.sortBy === 'dietary') {
        const dietaryA = a.dietary || '';
        const dietaryB = b.dietary || '';
        if (dietaryA !== dietaryB) {
          return dietaryA.localeCompare(dietaryB);
        }
        return a.first_name.localeCompare(b.first_name);
      } else {
        // firstName (default)
        return a.first_name.localeCompare(b.first_name);
      }
    });
  }, [guests, tables, settings.sortBy]);

  // Compute dietary summary counts for the 11 tracked dietary types
   const dietarySummary = useMemo(() => {
    const trackedTypes = [
      'Kids Meal', 'Pescatarian', 'Vegetarian', 'Vegan', 'Seafood Free',
      'Gluten Free', 'Dairy Free', 'Nut Free', 'Halal', 'Kosher', 'Vendor'
    ];
    const counts: { label: string; count: number }[] = [];
    for (const type of trackedTypes) {
      const typeLower = type.toLowerCase();
      const count = dietaryGuests.filter(g => {
        if (!g.dietary) return false;
        const values = g.dietary.toLowerCase().split(/[,;\n/+]|\s+and\s+/).map(value => value.trim());
        return values.some(val => {
        if (val === typeLower) return true;
        if (val.startsWith(typeLower) || typeLower.startsWith(val)) return true;
        // Flexible prefix match: match if first 4+ chars are the same (handles Kosha→Kosher etc.)
        const minLen = Math.min(val.length, typeLower.length);
        if (minLen >= 4) {
          const prefixLen = Math.max(4, minLen - 1);
          if (val.substring(0, prefixLen) === typeLower.substring(0, prefixLen)) return true;
        }
        return false;
        });
      }).length;
      counts.push({ label: type, count });
    }
    return counts;
  }, [dietaryGuests]);

  const reportHeaderRef = React.useRef<HTMLElement | null>(null);
  const measurementTableRef = React.useRef<HTMLTableElement | null>(null);
  const a4PreviewRef = React.useRef<HTMLDivElement | null>(null);
  const [pagination, setPagination] = useState<{ pages: DietaryGuest[][]; rowHeightsMm: Record<string, number>; exclusionMm: number }>({
    pages: [],
    rowHeightsMm: {},
    exclusionMm: 0,
  });

  React.useLayoutEffect(() => {
    const table = measurementTableRef.current;
    const header = reportHeaderRef.current;
    if (!table || !header || dietaryGuests.length === 0) {
      setPagination({ pages: chunkDietaryGuests(dietaryGuests, 25), rowHeightsMm: {}, exclusionMm: 0 });
      return;
    }

    const pxPerMm = 96 / 25.4;
    const rowElements = Array.from(table.querySelectorAll<HTMLTableRowElement>('tbody tr[data-guest-id]'));
    const rowHeightsPx = new Map(rowElements.map(row => [row.dataset.guestId || '', row.getBoundingClientRect().height]));
    const completeHeights = Array.from(rowHeightsPx.values()).filter(height => height > 0);
    if (completeHeights.length === 0) return;

    const exclusionPx = Math.min(...completeHeights);
    const tableHeaderPx = table.tHead?.getBoundingClientRect().height || 0;
    const innerPagePx = (DIETARY_A4_LAYOUT.heightMm - DIETARY_A4_LAYOUT.paddingTopMm - DIETARY_A4_LAYOUT.paddingBottomMm) * pxPerMm;
    const footerPx = DIETARY_A4_LAYOUT.footerMinHeightMm * pxPerMm;
    const tableTopGapPx = 8; // Existing Tailwind mt-2 spacing.
    const safeRowsHeightPx = Math.max(0, innerPagePx - header.getBoundingClientRect().height - tableTopGapPx - tableHeaderPx - footerPx - exclusionPx);

    const pages = packDietaryGuestPages(dietaryGuests, rowHeightsPx, safeRowsHeightPx, exclusionPx, 25);
    setPagination({
      pages,
      rowHeightsMm: Object.fromEntries(Array.from(rowHeightsPx, ([id, height]) => [id, height / pxPerMm])),
      exclusionMm: exclusionPx / pxPerMm,
    });
  }, [dietaryGuests, settings.fontSize, settings.isBold, settings.isItalic, settings.isUnderline, settings.showGuestNames, settings.showGuestList, settings.showDietary, settings.showRelation, settings.showSeatNumbers, guestsLoading, tablesLoading, settingsLoading, currentEvent]);

  const totalPages = pagination.pages.length;
  const paginatedGuests = pagination.pages[Math.min(currentPage - 1, Math.max(0, totalPages - 1))] || [];

  // Reset to page 1 when the event or row height changes.
  React.useEffect(() => {
    setCurrentPage(1);
  }, [eventId, settings.fontSize, settings.isBold, settings.isItalic, settings.isUnderline, settings.sortBy, settings.showGuestNames, settings.showGuestList, settings.showDietary, settings.showRelation, settings.showSeatNumbers]);

  React.useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const renderPageForExport = React.useCallback(async (pageNumber: number) => {
    flushSync(() => setCurrentPage(pageNumber));
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  }, []);

  const printContentRef = React.useRef<HTMLDivElement | null>(null);
  const printParentRef = React.useRef<Node | null>(null);
  React.useEffect(() => {
    const beforePrint = () => {
      const host = printContentRef.current;
      if (!host || isExporting || settingsLoading || !totalPages) return;
      printParentRef.current = host.parentNode;
      host.replaceChildren();
      for (let pageNumber=1; pageNumber<=totalPages; pageNumber++) {
        flushSync(() => setCurrentPage(pageNumber));
        if (a4PreviewRef.current) {
          const clone = a4PreviewRef.current.cloneNode(true) as HTMLElement;
          clone.dataset.dietaryPrintPage='true';
          clone.style.border='0'; clone.style.boxShadow='none';
          host.appendChild(clone);
        }
      }
      document.body.appendChild(host);
      flushSync(() => setCurrentPage(currentPage));
    };
    const afterPrint = () => {const host=printContentRef.current;if(host){host.replaceChildren();printParentRef.current?.appendChild(host);}};
    window.addEventListener('beforeprint', beforePrint);
    window.addEventListener('afterprint', afterPrint);
    return () => {window.removeEventListener('beforeprint', beforePrint);window.removeEventListener('afterprint', afterPrint);};
  }, [currentPage,totalPages,isExporting,settingsLoading]);

  // PDF Export functionality - Current page only
  const handleDownloadPdf = async () => {
    if (isExporting || guestsLoading || tablesLoading || settingsLoading || !currentEvent || paginatedGuests.length === 0) return;

    setIsExporting(true);
    setExportTarget('single');
    try {
      toast({
        title: 'Generating PDF',
        description: 'Creating your dietary chart (current page)...',
      });

      const { exportDietaryPreviewToPdf } = await import('@/lib/dietaryChartPdfExporter');
      await exportDietaryPreviewToPdf({
        eventName: currentEvent.name,
        eventDate: currentEvent.date,
        mode: 'single',
        pageNumbers: [currentPage],
        currentPage,
        renderPage: renderPageForExport,
        getPageElement: () => a4PreviewRef.current,
      });

      toast({
        title: 'PDF Downloaded',
        description: 'Your dietary chart has been saved',
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

  // PDF Export functionality - All pages
  const handleDownloadPdfAll = async () => {
    if (isExporting || guestsLoading || tablesLoading || settingsLoading || !currentEvent || dietaryGuests.length === 0) return;

    setIsExporting(true);
    setExportTarget('all');
    try {
      toast({
        title: 'Generating PDF',
        description: 'Creating your dietary chart (all pages)...',
      });

      const { exportDietaryPreviewToPdf } = await import('@/lib/dietaryChartPdfExporter');
      await exportDietaryPreviewToPdf({
        eventName: currentEvent.name,
        eventDate: currentEvent.date,
        mode: 'all',
        pageNumbers: pagination.pages.map((_, index) => index + 1),
        currentPage,
        renderPage: renderPageForExport,
        getPageElement: () => a4PreviewRef.current,
      });

      toast({
        title: 'PDF Downloaded',
        description: 'Your dietary chart has been saved',
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

  if (guestsLoading) {
    return (
      <Card className={`${styles.page} ${styles.emptyPanel} ww-box w-full`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div data-dietary-body className="text-muted-foreground">Loading dietary requirements...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <style>{`
        @media (max-width: 1023px) {
          .kitchen-dietary-chart { overflow-x: hidden; }
        }
        .dietary-scroll-hint { display: none; }


        @page { size:A4 portrait; margin:0; }
        @media print {
          body > :not(#dietary-print-content) { display:none !important; }
          body { margin:0 !important; padding:0 !important; }
          body * { visibility:hidden !important; }
          #dietary-print-content, #dietary-print-content * { visibility:visible !important; -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; }
          #dietary-print-content { display:block !important; position:absolute; inset:0 auto auto 0; width:210mm; }
          #dietary-print-content > div { break-after:page; }
          #dietary-print-content > div:last-child { break-after:auto; }
        }
      `}</style>

      <div className={`${premiumStyles.page} ${styles.page} space-y-6 kitchen-dietary-chart`}>
        {/* Header Card */}
        <Card className={`${premiumStyles.mainStudio} ${styles.headerPanel} print:hidden`}>
          <CardHeader className="space-y-0">
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(380px,520px)] xl:gap-6 xl:items-stretch">
              <div className="space-y-4 min-w-0">
                <div className="flex items-start gap-2">
                  <ChefHat className="w-[25px] h-[25px] mt-0.5 text-[#472c1d] shrink-0" strokeWidth={1.8} aria-hidden="true" />
                  <div className="min-w-0">
                    <CardTitle className={`${styles.pageHeading} dietary-main-heading text-left text-2xl font-bold text-[#472c1d]`}>Kitchen Dietary Requirements</CardTitle>
                    <CardDescription className={`${styles.pageDescription} text-left`}>
                      Staff reference sheet for guests with dietary requirements and allergies
                    </CardDescription>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 flex-wrap">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
                    <label className={`${styles.interfaceLabel} text-sm font-medium text-foreground whitespace-nowrap inline-flex items-center gap-[7px]`}>
                      <CalendarDays className="w-[17px] h-[17px] shrink-0" strokeWidth={1.8} aria-hidden="true" />
                      Choose Event:
                    </label>
                    <Select value={eventId || "no-event"} disabled={isExporting} onValueChange={handleEventSelect}>
                      <SelectTrigger aria-label="Choose Event" className={`${styles.selectTrigger} w-full sm:w-[300px] font-bold`}>
                        <SelectValue placeholder="Choose Event" />
                      </SelectTrigger>
                      <SelectContent className={styles.portalSurface}>
                        {events.length > 0 ? (
                          events.map(event => (
                            <SelectItem className={styles.portalItem} key={event.id} value={event.id}>
                              <div className="flex items-center gap-2">
                                <CalendarDays className="w-[17px] h-[17px]" strokeWidth={1.8} aria-hidden="true" />
                                <span>{event.name}</span>
                              </div>
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem className={styles.portalItem} value="no-events" disabled>
                            No events found
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  {currentEvent && (
                    <Badge
                      variant="outline"
                      className={`${styles.statsPill} w-fit max-w-full h-10 px-3 py-2 whitespace-normal`}
                    >
                      <UtensilsCrossed className="w-4 h-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />
                      <span className={`${styles.compactStatus} ml-1.5`}>
                        {dietaryGuests.length} Guest{dietaryGuests.length !== 1 ? 's' : ''} with dietary requirements
                      </span>
                    </Badge>
                  )}
                </div>
              </div>

              {/* Export Controls */}
              {currentEvent && dietaryGuests.length > 0 && (
                <div data-export-controls-panel className={`${styles.exportPanel} rounded-xl p-3 sm:p-4 flex flex-col justify-between gap-3 min-w-0`}>
                  <div className="text-sm space-y-1">
                    <span data-export-controls-heading><ExportControlsPrinter size={16} strokeWidth={2} aria-hidden="true" />Export Controls</span>

                  </div>
                  <div className="flex flex-wrap items-center gap-3 max-sm:flex-col max-sm:items-stretch">
                    <button
                      className={`${styles.exportButton} ww-itc-export-button inline-flex items-center gap-1.5 h-10 px-4 text-sm font-semibold border-0 rounded-full transition-colors disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2`}
                      onClick={handleDownloadPdf}
                      disabled={isExporting || guestsLoading || tablesLoading || settingsLoading || paginatedGuests.length === 0}
                      aria-label="Download single page PDF"
                    >
                      {exportTarget === 'single' ? (
                        <LoaderCircle className="w-4 h-4 animate-spin text-green-600" strokeWidth={1.8} aria-hidden="true" />
                      ) : (
                        <FileDown className="w-4 h-4 text-green-600" strokeWidth={1.8} aria-hidden="true" />
                      )}
                      Download single page PDF
                    </button>
                    <button
                      className={`${styles.exportButton} ww-itc-export-button inline-flex items-center gap-1.5 h-10 px-4 text-sm font-semibold border-0 rounded-full transition-colors disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2`}
                      onClick={handleDownloadPdfAll}
                      disabled={isExporting || guestsLoading || tablesLoading || settingsLoading || dietaryGuests.length === 0}
                      aria-label="Download all pages PDF"
                    >
                      {exportTarget === 'all' ? (
                        <LoaderCircle className="w-4 h-4 animate-spin text-green-600" strokeWidth={1.8} aria-hidden="true" />
                      ) : (
                        <Files className="w-4 h-4 text-green-600" strokeWidth={1.8} aria-hidden="true" />
                      )}
                      Download all pages PDF
                    </button>
                  </div>
                </div>
              )}
            </div>
          </CardHeader>
        </Card>

        {/* Placeholder when no event selected */}
        {!currentEvent && (
          <Card className={`${styles.emptyPanel} print:hidden`}>
            <CardContent className="p-8 text-center">
              <ChefHat className="w-16 h-16 mx-auto text-muted-foreground mb-4" strokeWidth={1.8} aria-hidden="true" />
              <CardTitle className={`${styles.sectionHeading} mb-2`}>Select an Event</CardTitle>
              <CardDescription>
                Choose an event from the dropdown above to view dietary requirements
              </CardDescription>
            </CardContent>
          </Card>
        )}

        {/* Main Content Grid: Settings + A4 Display */}
        {currentEvent && (
        <>
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,3fr)] gap-6 bg-transparent">
          {/* Settings Panel (Left - 1 column) */}
          <div className="min-w-0 print:hidden">
            <fieldset disabled={isExporting || settingsLoading} className="min-w-0">
            <DietaryChartCustomizer
              settings={settings}
              onSettingsChange={updateSettings}
            />
            </fieldset>
          </div>

          {/* A4 Page Display (Right - 3 columns) */}
          <div className={`${styles.previewStage} min-w-0 print:hidden dietary-a4-preview`}>
            {(guestsLoading || tablesLoading || settingsLoading) ? (
              <Card className={styles.emptyPanel}>
                <CardContent className="p-6">
                  <div className="text-center py-8">
                    <div className="w-12 h-12 mx-auto mb-4 rounded-full border-4 border-muted border-t-primary animate-spin" />
                    <p className="text-muted-foreground font-medium">Loading dietary requirements...</p>
                  </div>
                </CardContent>
              </Card>
            ) : dietaryGuests.length === 0 ? (
              <Card className={styles.emptyPanel}>
                <CardContent className="p-6">
                  <div className="text-center py-8">
                    <TriangleAlert className="w-12 h-12 mx-auto mb-4 text-muted-foreground" strokeWidth={1.8} aria-hidden="true" />
                    <p className="text-muted-foreground font-medium">No dietary requirements</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      All guests have selected "None" or "NA" for dietary requirements
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Page Navigation */}
                {totalPages > 1 && (
                  <div className={`${styles.pagination} flex items-center justify-center gap-4 mb-4`}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={isExporting || currentPage === 1}
                      className={styles.paginationButton}
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" strokeWidth={1.8} aria-hidden="true" />
                      Previous
                    </Button>
                    <span data-dietary-pagination="true" data-page-guest-count={paginatedGuests.length} className={`${styles.paginationLabel} text-sm`}>
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={isExporting || currentPage === totalPages}
                      className={styles.paginationButton}
                    >
                      Next
                      <ChevronRight className="w-4 h-4 ml-1" strokeWidth={1.8} aria-hidden="true" />
                    </Button>
                  </div>
                )}

                {/* A4 Page Container - horizontally scrollable on small screens, centered on desktop */}
                <div className="w-full overflow-x-auto overflow-y-hidden">
                  <div className="mx-auto" style={{ width: 'max-content' }}>
                  <div
                    ref={a4PreviewRef}
                    data-dietary-a4-preview="true"
                    className="bg-white border border-gray-300 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.15)]"
                    style={{
                      width: `${DIETARY_A4_LAYOUT.widthMm}mm`,
                      height: `${DIETARY_A4_LAYOUT.heightMm}mm`,
                      minWidth: `${DIETARY_A4_LAYOUT.widthMm}mm`,
                      maxWidth: `${DIETARY_A4_LAYOUT.widthMm}mm`,
                      color: DIETARY_REPORT_TEXT_COLOR,
                      fontFamily: 'Arial, Helvetica, sans-serif',
                      boxSizing: 'border-box',
                      overflow: 'hidden'
                    }}
                  >
                    <div style={{ height: '100%', padding: `${DIETARY_A4_LAYOUT.paddingTopMm}mm ${DIETARY_A4_LAYOUT.paddingRightMm}mm ${DIETARY_A4_LAYOUT.paddingBottomMm}mm ${DIETARY_A4_LAYOUT.paddingLeftMm}mm`, boxSizing: 'border-box' }} className="flex flex-col">
                      {/* Header - matching Full Seating Chart style */}
                      <header ref={reportHeaderRef} className="text-center" style={{ color: DIETARY_REPORT_TEXT_COLOR }}>
                        {/* Line 1: Event Name */}
                        <h1 style={{ fontSize: `${DIETARY_A4_LAYOUT.eventNameFontPt}pt`, fontWeight: 700, lineHeight: DIETARY_A4_LAYOUT.eventNameLineHeight, overflowWrap: 'anywhere', margin: 0 }}>
                          {currentEvent.name}
                        </h1>

                        {/* Line 2: Kitchen Dietary Requirements */}
                        <p style={{ fontSize: `${DIETARY_A4_LAYOUT.reportTitleFontPt}pt`, margin: 0, marginTop: `${DIETARY_A4_LAYOUT.reportTitleMarginTopPx}px` }}>
                          Kitchen Dietary Requirements
                        </p>


                        {/* Ceremony info line */}
                        {currentEvent.ceremony_date && (
                          <p data-pdf-text-nudge="details" style={{ fontSize: `${DIETARY_A4_LAYOUT.detailsFontPt}pt`, lineHeight: DIETARY_A4_LAYOUT.detailsLineHeight, margin: 0, marginTop: `${DIETARY_A4_LAYOUT.detailsMarginTopPx}px`, overflowWrap: 'anywhere' }}>
                            Ceremony: {formatDateWithOrdinal(currentEvent.ceremony_date)} | {currentEvent.ceremony_venue || 'Venue TBD'} | {formatTimeDisplay(currentEvent.ceremony_start_time)} – {formatTimeDisplay(currentEvent.ceremony_finish_time)}
                          </p>
                        )}

                        {/* Reception info line */}
                        <p data-pdf-text-nudge="details" style={{ fontSize: `${DIETARY_A4_LAYOUT.detailsFontPt}pt`, lineHeight: DIETARY_A4_LAYOUT.detailsLineHeight, margin: 0, marginTop: currentEvent.ceremony_date ? 0 : `${DIETARY_A4_LAYOUT.detailsMarginTopPx}px`, overflowWrap: 'anywhere' }}>
                          Reception: {currentEvent.date && formatDateWithOrdinal(currentEvent.date)} | {currentEvent.venue || 'Venue TBD'} | {formatTimeDisplay(currentEvent.start_time)} – {formatTimeDisplay(currentEvent.finish_time)}
                        </p>

                        {/* Header separator */}
                        <div data-header-separator="true" style={{ borderTop: `${DIETARY_A4_LAYOUT.separatorWidthPx}px solid #000`, marginTop: `${DIETARY_A4_LAYOUT.separatorMarginTopPx}px` }} />

                        {/* Total Dietary Guest Requirements */}
                        <p data-pdf-text-nudge="total" className="text-center" style={{ marginTop: '1mm', marginBottom: '0.5mm', lineHeight: '1.2' }}>
                          Total Dietary Guest Requirements: <strong>{dietaryGuests.length}</strong>
                        </p>
                      </header>

                      {/* Guest Table */}
                      <div className="flex-1 overflow-hidden text-sm mt-2">
                        <table className="w-full border-collapse mt-0">
                          <thead>
                            <tr style={{ backgroundColor: '#f3f3f3', borderTop: '2px solid #ccc', borderBottom: '2px solid #ccc' }}>
                              <th colSpan={99} className="py-[3px] px-[4pt]">
                                {dietarySummary.length > 0 ? (
                                  <div data-pdf-text-nudge="summary" className="flex flex-col items-center gap-y-0.5">
                                    <div className="flex flex-nowrap justify-center gap-x-3">
                                      {dietarySummary.filter(item => ['Kids Meal','Pescatarian','Vegetarian','Vegan','Seafood Free','Gluten Free'].includes(item.label)).map(item => (
                                        <span key={item.label} style={{ fontWeight: 'normal', whiteSpace: 'nowrap' }}>
                                          {item.label}: <strong>{item.count}</strong>
                                        </span>
                                      ))}
                                    </div>
                                    <div className="flex flex-nowrap justify-center gap-x-3">
                                      {dietarySummary.filter(item => ['Dairy Free','Nut Free','Halal','Kosher','Vendor'].includes(item.label)).map(item => (
                                        <span key={item.label} style={{ fontWeight: 'normal', whiteSpace: 'nowrap' }}>
                                          {item.label}: <strong>{item.count}</strong>
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                ) : (
                                  <span>&nbsp;</span>
                                )}
                              </th>
                            </tr>
                            <tr style={{ backgroundColor: '#f3f3f3', borderTop: '2px solid #ccc', borderBottom: '2px solid #ccc' }}>
                              <th data-pdf-text-nudge="column-heading" className="text-left py-[3px] px-[4pt] font-bold" style={{ color: '#000' }}>First Name</th>
                              <th data-pdf-text-nudge="column-heading" className="text-left py-[3px] px-[4pt] font-bold" style={{ color: '#000' }}>Last Name</th>
                              <th data-pdf-text-nudge="column-heading" className="text-left py-[3px] px-[4pt] font-bold" style={{ color: '#000' }}>Table</th>
                              <th data-pdf-text-nudge="column-heading" className="text-left py-[3px] px-[4pt] font-bold" style={{ color: '#000' }}>Seat</th>
                              <th data-pdf-text-nudge="column-heading" className="text-left py-[3px] px-[4pt] font-bold" style={{ color: '#000' }}>Dietary</th>
                              <th data-pdf-text-nudge="column-heading" className="text-left py-[3px] px-[4pt] font-bold" style={{ color: '#000' }}>Mobile</th>
                              <th data-pdf-text-nudge="column-heading" className="text-left py-[3px] px-[4pt] font-bold" style={{ color: '#000' }}>Relation</th>
                            </tr>
                          </thead>
                          <tbody>
                            {settings.showGuestList && paginatedGuests.map((guest, index) => {
                              const textStyle: React.CSSProperties = {
                                fontSize: `${DIETARY_GUEST_TEXT_SIZES[settings.fontSize]}pt`,
                                fontWeight: settings.isBold ? 'bold' : undefined,
                                fontStyle: settings.isItalic ? 'italic' : undefined,
                                textDecoration: settings.isUnderline ? 'underline' : undefined,
                              };
                              return (
                              <tr
                                key={guest.id}
                                className={index % 2 === 0 ? 'bg-[#f9fafb]' : 'bg-white'}
                              >
                                <td data-pdf-text-nudge="guest-cell" data-dietary-field="first-name" className="py-[3.5pt] px-[4pt] border-b border-gray-200" style={{ ...textStyle, color: settings.guestNameColor }}>
                                  {settings.showGuestNames ? guest.first_name : ''}
                                </td>
                                <td data-pdf-text-nudge="guest-cell" data-dietary-field="last-name" className="py-[3.5pt] px-[4pt] border-b border-gray-200" style={{ ...textStyle, color: settings.guestNameColor }}>
                                  {settings.showGuestNames ? guest.last_name || '-' : ''}
                                </td>
                                <td data-pdf-text-nudge="guest-cell" data-dietary-field="table" className="py-[3.5pt] px-[4pt] border-b border-gray-200" style={{ ...textStyle, color: settings.guestListColor }}>
                                  {guest.table_display}
                                </td>
                                <td data-pdf-text-nudge="guest-cell" data-dietary-field="seat" className="py-[3.5pt] px-[4pt] border-b border-gray-200" style={{ ...textStyle, color: settings.seatNumberColor }}>
                                  {settings.showSeatNumbers ? guest.seat_no || '-' : ''}
                                </td>
                                <td data-pdf-text-nudge="guest-cell" data-dietary-field="dietary" className="py-[3.5pt] px-[4pt] border-b border-gray-200" style={{ ...textStyle, color: settings.dietaryColor }}>
                                  {settings.showDietary ? guest.dietary : ''}
                                </td>
                                <td data-pdf-text-nudge="guest-cell" data-dietary-field="mobile" className="py-[3.5pt] px-[4pt] border-b border-gray-200" style={{ ...textStyle, color: settings.guestListColor }}>
                                  {guest.mobile || '-'}
                                </td>
                                <td data-pdf-text-nudge="guest-cell" data-dietary-field="relationship" className="py-[3.5pt] px-[4pt] border-b border-gray-200" style={{ ...textStyle, color: settings.relationshipColor }}>
                                  {settings.showRelation ? computeRelationDisplay(
                                      guest.relation_partner,
                                      guest.relation_role,
                                      currentEvent?.partner1_name,
                                      currentEvent?.partner2_name,
                                      []
                                    ) || 'Guest' : ''}
                                </td>
                              </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      <div aria-hidden="true" data-footer-exclusion-zone="true" className="flex-shrink-0" style={{ minHeight: `${pagination.exclusionMm}mm` }} />

                      <footer data-footer-layout="three-column" data-footer-alignment="single-line-centred" className="flex-shrink-0" style={{ marginTop: 'auto', display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', minHeight: `${DIETARY_A4_LAYOUT.footerMinHeightMm}mm`, color: DIETARY_REPORT_TEXT_COLOR, fontSize: `${DIETARY_A4_LAYOUT.footerFontPt}pt`, lineHeight: 1 }}>
                        <div data-footer-generated="true" style={{ justifySelf: 'start', alignSelf: 'center', whiteSpace: 'nowrap' }}>Generated: {formatGeneratedTimestamp()}</div>
                        {settings.showLogo
                          ? <img src={dietaryLogo} alt="Wedding Waitress" style={{ width: `${DIETARY_A4_LAYOUT.logoWidthMm}mm`, height: `${DIETARY_A4_LAYOUT.logoHeightMm}mm`, alignSelf: 'center', objectFit: 'contain' }} />
                          : <div style={{ width: `${DIETARY_A4_LAYOUT.logoWidthMm}mm`, height: `${DIETARY_A4_LAYOUT.logoHeightMm}mm` }} />}
                        <div data-footer-page-number="true" style={{ justifySelf: 'end', alignSelf: 'center', whiteSpace: 'nowrap' }}>Page {currentPage} of {totalPages}</div>
                      </footer>
                    </div>
                  </div>
                  </div>
                </div>

                {/* A4-width measurement table: establishes actual wrapped row heights before page packing. */}
                <div aria-hidden="true" style={{ position: 'fixed', left: '-10000px', top: 0, width: `${DIETARY_A4_LAYOUT.widthMm - DIETARY_A4_LAYOUT.paddingLeftMm - DIETARY_A4_LAYOUT.paddingRightMm}mm`, visibility: 'hidden', pointerEvents: 'none' }}>
                  <table ref={measurementTableRef} className="w-full border-collapse table-auto [overflow-wrap:anywhere]" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
                    <colgroup>
                      <col style={{ width: '30px' }} /><col style={{ width: '30px' }} /><col style={{ width: '25px' }} />
                      <col style={{ width: '15px' }} />
                      <col style={{ width: '35px' }} />
                      <col style={{ width: '30px' }} />
                      <col style={{ width: '40px' }} />
                    </colgroup>
                    <thead>
                      <tr><th colSpan={99} className="py-[3px] px-[4pt]"><div className="flex flex-col gap-y-0.5"><div>&nbsp;</div><div>&nbsp;</div></div></th></tr>
                      <tr>
                        <th className="text-left py-[3px] px-[4pt] font-bold">First Name</th><th className="text-left py-[3px] px-[4pt] font-bold">Last Name</th><th className="text-left py-[3px] px-[4pt] font-bold">Table</th>
                        <th className="text-left py-[3px] px-[4pt] font-bold">Seat</th>
                        <th className="text-left py-[3px] px-[4pt] font-bold">Dietary</th>
                        <th className="text-left py-[3px] px-[4pt] font-bold">Mobile</th>
                        <th className="text-left py-[3px] px-[4pt] font-bold">Relation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dietaryGuests.map(guest => {
                        const measureStyle: React.CSSProperties = { fontSize: `${DIETARY_GUEST_TEXT_SIZES[settings.fontSize]}pt`, fontWeight: settings.isBold ? 'bold' : undefined, fontStyle: settings.isItalic ? 'italic' : undefined, textDecoration: settings.isUnderline ? 'underline' : undefined };
                        return <tr key={guest.id} data-guest-id={guest.id}>
                          <td className="py-[3.5pt] px-[4pt]" style={measureStyle}>{settings.showGuestNames ? guest.first_name : ''}</td><td className="py-[3.5pt] px-[4pt]" style={measureStyle}>{settings.showGuestNames ? guest.last_name || '-' : ''}</td><td className="py-[3.5pt] px-[4pt]" style={measureStyle}>{guest.table_display}</td>
                          <td className="py-[3.5pt] px-[4pt]" style={measureStyle}>{settings.showSeatNumbers ? guest.seat_no || '-' : ''}</td>
                          <td className="py-[3.5pt] px-[4pt]" style={measureStyle}>{settings.showDietary ? guest.dietary : ''}</td>
                          <td className="py-[3.5pt] px-[4pt]" style={measureStyle}>{guest.mobile || '-'}</td>
                          <td className="py-[3.5pt] px-[4pt]" style={measureStyle}>{settings.showRelation ? computeRelationDisplay(guest.relation_partner, guest.relation_role, currentEvent?.partner1_name, currentEvent?.partner2_name, []) || 'Guest' : ''}</td>
                        </tr>;
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Page Navigation Bottom */}
                {totalPages > 1 && (
                  <div className={`${styles.pagination} flex items-center justify-center gap-4 mt-4`}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={isExporting || currentPage === 1}
                      className={styles.paginationButton}
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" strokeWidth={1.8} aria-hidden="true" />
                      Previous
                    </Button>
                    <span className={`${styles.paginationLabel} text-sm`}>
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={isExporting || currentPage === totalPages}
                      className={styles.paginationButton}
                    >
                      Next
                      <ChevronRight className="w-4 h-4 ml-1" strokeWidth={1.8} aria-hidden="true" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Print Version - A4 Pages */}
        <div id="dietary-print-content" ref={printContentRef} className="hidden" />
        </>
        )}
      </div>
    </>
  );
};
