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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, ChefHat, AlertCircle, ChevronLeft, ChevronRight, Users, Calendar, Layout } from 'lucide-react';
import { useRealtimeGuests } from '@/hooks/useRealtimeGuests';
import { useEvents } from '@/hooks/useEvents';
import { useTables } from '@/hooks/useTables';
import { useDietaryChartSettings } from '@/hooks/useDietaryChartSettings';
import { DietaryChartCustomizer } from './DietaryChartCustomizer';
import { useToast } from '@/hooks/use-toast';
import { exportDietaryChartToPdf } from '@/lib/dietaryChartPdfExporter';
import { format } from 'date-fns';
import dietaryLogo from '@/assets/wedding-waitress-dietary-logo.png';
import { computeRelationDisplay } from '@/lib/relationUtils';
import { Event } from '@/hooks/useEvents';

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
  relation_partner: string;
  relation_role: string;
  mobile: string | null;
}

export const KitchenDietaryChart: React.FC<KitchenDietaryChartProps> = ({ eventId, onEventSelect, events }) => {
  const { guests, loading: guestsLoading } = useRealtimeGuests(eventId);
  const { tables, loading: tablesLoading } = useTables(eventId);
  const { settings, loading: settingsLoading, updateSettings } = useDietaryChartSettings(eventId);
  const [isExporting, setIsExporting] = useState(false);
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

  const formatGeneratedTimestamp = () => {
    const now = new Date();
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
        guest.dietary.toLowerCase() !== 'na' &&
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
          table_no: guest.table_no,
          table_id: guest.table_id || null,
          table_display: tableDisplay,
          seat_no: guest.seat_no,
          dietary: guest.dietary,
          relation_partner: guest.relation_partner,
          relation_role: guest.relation_role,
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
      'Gluten Free', 'Dairy Free', 'Nut Free', 'Halal', 'Kosher', 'Vendor Meal'
    ];
    const counts: { label: string; count: number }[] = [];
    for (const type of trackedTypes) {
      const typeLower = type.toLowerCase();
      const count = dietaryGuests.filter(g => {
        if (!g.dietary) return false;
        const val = g.dietary.toLowerCase().trim();
        if (val === typeLower) return true;
        if (val.startsWith(typeLower) || typeLower.startsWith(val)) return true;
        // Flexible prefix match: match if first 4+ chars are the same (handles Kosha→Kosher etc.)
        const minLen = Math.min(val.length, typeLower.length);
        if (minLen >= 4) {
          const prefixLen = Math.max(4, minLen - 1);
          if (val.substring(0, prefixLen) === typeLower.substring(0, prefixLen)) return true;
        }
        return false;
      }).length;
      counts.push({ label: type, count });
    }
    return counts;
  }, [dietaryGuests]);

  // AUTOFIT: Dynamic guests per page based on font size
  const guestsPerPage = useMemo(() => {
    const availableHeight = 228;
    const rowHeightByFontSize: Record<string, number> = {
      'small': 9,
      'medium': 10,
      'large': 11.5
    };
    const rowHeight = rowHeightByFontSize[settings.fontSize] || 10;
    return Math.floor(availableHeight / rowHeight);
  }, [settings.fontSize]);

  const totalPages = Math.ceil(dietaryGuests.length / guestsPerPage);
  const paginatedGuests = useMemo(() => {
    const start = (currentPage - 1) * guestsPerPage;
    return dietaryGuests.slice(start, start + guestsPerPage);
  }, [dietaryGuests, currentPage, guestsPerPage]);

  // Reset to page 1 when event changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [eventId]);

  // Font size mapping
  const getFontSizeClass = () => {
    switch (settings.fontSize) {
      case 'small': return 'text-sm';
      case 'large': return 'text-lg';
      default: return 'text-base';
    }
  };

  // PDF Export functionality - Current page only
  const handleDownloadPdf = async () => {
    if (!currentEvent || paginatedGuests.length === 0) return;
    
    setIsExporting(true);
    try {
      toast({
        title: 'Generating PDF',
        description: 'Creating your dietary chart (current page)...',
      });

      await exportDietaryChartToPdf(currentEvent, paginatedGuests, settings, 'single', dietaryGuests.length);

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
    }
  };

  // PDF Export functionality - All pages
  const handleDownloadPdfAll = async () => {
    if (!currentEvent || dietaryGuests.length === 0) return;
    
    setIsExporting(true);
    try {
      toast({
        title: 'Generating PDF',
        description: 'Creating your dietary chart (all pages)...',
      });

      await exportDietaryChartToPdf(currentEvent, dietaryGuests, settings, 'all');

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
    }
  };

  const isDataReady = eventId && !guestsLoading && dietaryGuests.length >= 0;

  if (guestsLoading) {
    return (
      <Card className="ww-box w-full">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="text-muted-foreground">Loading dietary requirements...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <style>{`
        @page {
          size: A4 portrait;
          margin: 0;
        }
        
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          html, body {
            margin: 0;
            padding: 0;
            background: white !important;
            width: 210mm;
            height: auto;
          }
          
          .print-page {
            position: relative;
            width: 210mm;
            height: 297mm;
            padding: 1.27cm;
            display: flex;
            flex-direction: column;
            background-color: white !important;
            box-sizing: border-box;
            page-break-after: always;
            overflow: visible;
          }
          
          .print-page:last-child {
            page-break-after: auto;
          }
          
          .print-page table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
          }
          
          .print-page table thead tr {
            border-bottom: 2px solid #000;
          }
          
          .print-page table th {
            text-align: left;
            padding: 1pt 4pt;
            font-weight: 600;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            line-height: 1.15 !important;
          }
          
          .print-page table td {
            padding: 2pt 4pt;
            border-bottom: 1px solid #e5e7eb;
            page-break-inside: avoid;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            line-height: 1.15 !important;
          }
          
          /* Dynamic row heights based on font size - matches PDF autofit */
          .print-font-small table td { height: 9mm !important; }
          .print-font-medium table td { height: 10mm !important; }
          .print-font-large table td { height: 11.5mm !important; }
          
          .print-page table tbody tr {
            break-inside: avoid;
          }
          
          .print-page table tbody tr:nth-child(even) {
            background-color: #f9fafb !important;
          }
          
          .print-page table tbody tr:nth-child(odd) {
            background-color: white !important;
          }
          
          /* Font size variants for print */
          .print-font-small {
            font-size: 10.5pt;
          }
          
          .print-font-medium {
            font-size: 12pt;
          }
          
          .print-font-large {
            font-size: 13.5pt;
          }
          
          .print-page .print-header {
            margin-bottom: 1mm;
            break-inside: avoid;
          }
          /* Normalize header spacing */
          .print-header h1 {
            font-size: 16pt !important;
            line-height: 1.1 !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            margin: 0 !important;
          }
          .print-header h2 {
            margin: 0 !important;
            line-height: 1.1 !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
          }
          .print-header > * + * { margin-top: 0.75mm !important; }
          .print-header .meta-line {
            font-size: 10pt !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            padding-bottom: 1mm !important;
          }

          .print-page table {
            margin-top: 0mm;
          }
          /* Reserve space for footer logo without wasting height */
          .print-page .flex-1 { padding-bottom: 12mm !important; overflow: visible !important; }

          .print-page .print-footer {
            position: absolute;
            bottom: 10mm;
            left: 10mm;
            right: 10mm;
            display: flex;
            justify-content: center;
            break-inside: avoid;
          }
          
          .print-page .print-footer img {
            height: 10.5mm;
            width: auto;
            object-fit: contain;
          }
        }
      `}</style>
      
      <div className="space-y-6 kitchen-dietary-chart">
        {/* Header Card - Matching Full Seating Chart layout */}
        <Card className="border border-primary shadow-[0_4px_20px_-4px_rgba(0,0,0,0.15)] print:hidden">
          <CardHeader className="space-y-4">
            {/* Top row: Icon, Title, and Event Name */}
            <div className="flex items-center justify-between">
              {/* Header Icon & Info */}
              <div className="flex items-center gap-4">
                <ChefHat className="w-12 h-12 text-primary" />
                <div>
                  <CardTitle className="text-left text-2xl font-medium text-foreground">Kitchen Dietary Requirements</CardTitle>
                  <CardDescription className="text-left">
                    Staff reference sheet for guests with dietary requirements and allergies
                  </CardDescription>
                </div>
              </div>

              {currentEvent && (
                <span className="text-lg font-normal bg-gradient-to-r from-[#7C3AED] to-[#9333EA] bg-clip-text text-transparent">
                  Dietary Requirements for {currentEvent.name}
                </span>
              )}
            </div>

            {/* Bottom row: Choose Event dropdown, badges, and export controls */}
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center gap-4">
                <div className="flex items-center space-x-4">
                  <label className="text-sm font-medium text-foreground whitespace-nowrap">
                    Choose Event:
                  </label>
                  <Select value={eventId || "no-event"} onValueChange={handleEventSelect}>
                    <SelectTrigger className="w-full sm:w-[300px] border-primary focus:ring-primary font-bold text-[#7248e6]">
                      <SelectValue placeholder="Choose Event" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border z-50">
                      {events.length > 0 ? (
                        events.map(event => (
                          <SelectItem key={event.id} value={event.id}>
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              <span>{event.name}</span>
                            </div>
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-events" disabled>
                          No events found
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                {currentEvent && (
                  <>
                    <Badge 
                      variant="outline"
                      className="ml-4 bg-white border-primary text-primary rounded-full"
                    >
                      🍽️
                      <span className="ml-1.5">
                        {dietaryGuests.length} Guest{dietaryGuests.length !== 1 ? 's' : ''} with dietary requirements
                      </span>
                    </Badge>
                    <Badge 
                      variant="outline"
                      className="bg-white border-primary text-primary rounded-full"
                    >
                      {isDataReady ? 'Ready to Generate' : 'Loading Data...'}
                    </Badge>
                  </>
                )}
              </div>

              {/* Export Controls */}
              {currentEvent && dietaryGuests.length > 0 && (
                <div className="border border-primary rounded-xl p-3 flex flex-col gap-3 flex-shrink-0">
                  <div className="flex items-center">
                    <span className="font-bold text-sm">Export Controls</span>
                    <span className="text-muted-foreground ml-2 text-sm">
                      Download & share your dietary requirement guests with your venue / Kitchen.
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      className="inline-flex items-center gap-2 h-7 px-2.5 text-xs font-medium border-2 border-green-500 rounded-full text-green-600 bg-background hover:bg-green-50 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                      onClick={handleDownloadPdf}
                      disabled={isExporting || paginatedGuests.length === 0}
                    >
                      <FileText className="w-3 h-3" />
                      Download single page PDF
                    </button>
                    <button 
                      className="inline-flex items-center gap-2 h-7 px-2.5 text-xs font-medium border-2 border-green-500 rounded-full text-green-600 bg-background hover:bg-green-50 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                      onClick={handleDownloadPdfAll}
                      disabled={isExporting || dietaryGuests.length === 0}
                    >
                      <FileText className="w-3 h-3" />
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
          <Card className="ww-box print:hidden">
            <CardContent className="p-8 text-center">
              <ChefHat className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <CardTitle className="mb-2">Select an Event</CardTitle>
              <CardDescription>
                Choose an event from the dropdown above to view dietary requirements
              </CardDescription>
            </CardContent>
          </Card>
        )}

        {/* Main Content Grid: Settings + A4 Display */}
        {currentEvent && (
        <>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Settings Panel (Left - 1 column) */}
          <div className="lg:col-span-1 print:hidden">
            <DietaryChartCustomizer
              settings={settings}
              onSettingsChange={updateSettings}
            />
          </div>

          {/* A4 Page Display (Right - 3 columns) */}
          <div className="lg:col-span-3 print:hidden">
            {dietaryGuests.length === 0 ? (
              <Card className="ww-box">
                <CardContent className="p-6">
                  <div className="text-center py-8">
                    <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
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
                  <div className="flex items-center justify-center gap-4 mb-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                )}

                {/* A4 Page Container - Screen View */}
                <div className="flex justify-center">
                  <div 
                    className="bg-white border border-gray-300 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.15)]"
                    style={{ 
                      width: '210mm', 
                      minHeight: '325mm',
                      minWidth: '210mm',
                      maxWidth: '210mm'
                    }}
                  >
                    <div style={{ padding: '8mm 1.27cm 1.27cm 1.27cm' }} className="h-full flex flex-col">
                      {/* Header - matching Full Seating Chart style */}
                      <div className="text-center" style={{ marginBottom: '1mm' }}>
                        {/* Line 1: Event Name (purple, larger) */}
                        <h1 className="font-bold" style={{ color: '#6D28D9', fontSize: '16pt', marginBottom: '0.5mm', lineHeight: '1.1' }}>
                          {currentEvent.name}
                        </h1>
                        
                        {/* Line 2: Kitchen Dietary Requirements */}
                        <p style={{ fontSize: '11pt', marginBottom: '0.5mm', lineHeight: '1.1' }}>
                          Kitchen Dietary Requirements
                        </p>
                        
                        
                        {/* Ceremony info line */}
                        {currentEvent.ceremony_date && (
                          <p className="text-muted-foreground" style={{ fontSize: '8pt', marginBottom: '0.5mm', lineHeight: '1.1' }}>
                            Ceremony: {formatDateWithOrdinal(currentEvent.ceremony_date)} | {currentEvent.ceremony_venue || 'Venue TBD'} | {formatTimeDisplay(currentEvent.ceremony_start_time)} – {formatTimeDisplay(currentEvent.ceremony_finish_time)}
                          </p>
                        )}
                        
                        {/* Reception info line */}
                        <p className="text-muted-foreground" style={{ fontSize: '8pt', marginBottom: '0', lineHeight: '1.1' }}>
                          Reception: {currentEvent.date && formatDateWithOrdinal(currentEvent.date)} | {currentEvent.venue || 'Venue TBD'} | {formatTimeDisplay(currentEvent.start_time)} – {formatTimeDisplay(currentEvent.finish_time)}
                        </p>
                        
                        {/* Purple divider */}
                        <div style={{ borderTop: '2px solid #6D28D9', marginTop: '1.5mm' }}></div>
                        
                        {/* Total Dietary Guest Requirements - between purple line and gray header */}
                        <p className="text-center" style={{ marginTop: '1mm', marginBottom: '0.5mm', lineHeight: '1.2' }}>
                          Total Dietary Guest Requirements: <strong>{dietaryGuests.length}</strong>
                        </p>
                      </div>

                      {/* Guest Table */}
                      <div className={`flex-1 overflow-hidden ${getFontSizeClass()} mt-2`}>
                        <table className="w-full border-collapse mt-0">
                          <thead>
                            <tr style={{ backgroundColor: '#f3f3f3', borderTop: '2px solid #ccc', borderBottom: '2px solid #ccc' }}>
                              <th colSpan={99} className="py-[3px] px-[4pt]">
                                {dietarySummary.length > 0 ? (
                                  <div className="flex flex-col items-center gap-y-0.5">
                                    <div className="flex flex-nowrap justify-center gap-x-3">
                                      {dietarySummary.filter(item => ['Kids Meal','Pescatarian','Vegetarian','Vegan','Seafood Free','Gluten Free'].includes(item.label)).map(item => (
                                        <span key={item.label} style={{ fontWeight: 'normal', whiteSpace: 'nowrap' }}>
                                          {item.label}: <strong>{item.count}</strong>
                                        </span>
                                      ))}
                                    </div>
                                    <div className="flex flex-nowrap justify-center gap-x-3">
                                      {dietarySummary.filter(item => ['Dairy Free','Nut Free','Halal','Kosher','Vendor Meal'].includes(item.label)).map(item => (
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
                              <th className="text-left py-[3px] px-[4pt] font-bold" style={{ color: '#000' }}>First Name</th>
                              <th className="text-left py-[3px] px-[4pt] font-bold" style={{ color: '#000' }}>Last Name</th>
                              <th className="text-left py-[3px] px-[4pt] font-bold" style={{ color: '#000' }}>Table</th>
                              {settings.showSeatNo && (
                                <th className="text-left py-[3px] px-[4pt] font-bold" style={{ color: '#000' }}>Seat</th>
                              )}
                              <th className="text-left py-[3px] px-[4pt] font-bold" style={{ color: '#000' }}>Dietary</th>
                              {settings.showMobile && (
                                <th className="text-left py-[3px] px-[4pt] font-bold" style={{ color: '#000' }}>Mobile</th>
                              )}
                              {settings.showRelation && (
                                <th className="text-left py-[3px] px-[4pt] font-bold" style={{ color: '#000' }}>Relation</th>
                              )}
                            </tr>
                          </thead>
                          <tbody>
                            {paginatedGuests.map((guest, index) => {
                              const textStyle: React.CSSProperties = {
                                fontWeight: settings.isBold ? 'bold' : undefined,
                                fontStyle: settings.isItalic ? 'italic' : undefined,
                                textDecoration: settings.isUnderline ? 'underline' : undefined,
                              };
                              return (
                              <tr 
                                key={guest.id}
                                className={index % 2 === 0 ? 'bg-[#f9fafb]' : 'bg-white'}
                              >
                                <td className="py-[4pt] px-[4pt] border-b border-gray-200" style={textStyle}>
                                  {guest.first_name}
                                </td>
                                <td className="py-[4pt] px-[4pt] border-b border-gray-200" style={textStyle}>
                                  {guest.last_name || '-'}
                                </td>
                                <td className="py-[4pt] px-[4pt] border-b border-gray-200" style={textStyle}>
                                  {guest.table_display}
                                </td>
                                {settings.showSeatNo && (
                                  <td className="py-[4pt] px-[4pt] border-b border-gray-200" style={textStyle}>
                                    {guest.seat_no || '-'}
                                  </td>
                                )}
                                <td className="py-[4pt] px-[4pt] border-b border-gray-200 text-accent-foreground" style={{ fontWeight: settings.isBold ? 'bold' : undefined, fontStyle: settings.isItalic ? 'italic' : undefined, textDecoration: settings.isUnderline ? 'underline' : undefined }}>
                                  {guest.dietary}
                                </td>
                                {settings.showMobile && (
                                  <td className="py-[4pt] px-[4pt] border-b border-gray-200" style={textStyle}>
                                    {guest.mobile || '-'}
                                  </td>
                                )}
                                {settings.showRelation && (
                                  <td className="py-[4pt] px-[4pt] border-b border-gray-200" style={textStyle}>
                                    {computeRelationDisplay(
                                      guest.relation_partner as any,
                                      guest.relation_role as any,
                                      currentEvent?.partner1_name,
                                      currentEvent?.partner2_name,
                                      []
                                    ) || 'Guest'}
                                  </td>
                                )}
                              </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Footer - matching Full Seating Chart */}
                      <div className="flex-shrink-0" style={{ marginTop: 'auto', paddingBottom: '0' }}>
                        {settings.showLogo && (
                          <div className="flex justify-center" style={{ paddingTop: '0' }}>
                            <img 
                              src={dietaryLogo}
                              alt="Wedding Waitress" 
                              style={{ height: '12mm', width: 'auto', objectFit: 'contain' }}
                            />
                          </div>
                        )}
                        <div className="flex justify-between items-center px-1" style={{ fontSize: '7pt', color: '#aaa', marginTop: '1mm' }}>
                          <span>Page {currentPage} of {totalPages}</span>
                          <span>Generated: {formatGeneratedTimestamp()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Page Navigation Bottom */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-4 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Print Version - A4 Pages */}
        <div id="dietary-print-content" className="hidden print:block">
          {Array.from({ length: totalPages }, (_, pageIndex) => {
            const pageGuests = dietaryGuests.slice(
              pageIndex * guestsPerPage,
              (pageIndex + 1) * guestsPerPage
            );
            
            // Skip empty pages
            if (pageGuests.length === 0) return null;
            
            return (
              <div 
                key={pageIndex} 
                className="print-page"
              >
                {/* Header */}
                <div className="print-header text-center space-y-2">
                  {/* Event Name */}
                  {currentEvent && (
                    <>
                      <h1 className="text-xl font-semibold" style={{ color: '#7C3AED' }}>
                        {currentEvent.name}
                      </h1>

                      {/* Chart Title and Date */}
                      <h2 className={`font-semibold text-foreground ${
                        settings.fontSize === 'small' ? 'print-font-small' : 
                        settings.fontSize === 'large' ? 'print-font-large' : 
                        'print-font-medium'
                      }`}>
                        Kitchen Dietary Requirements
                        {currentEvent.date && ` - ${formatDateWithOrdinal(currentEvent.date)}`}
                      </h2>

                      {/* Meta Line */}
                      <div className="meta-line text-sm text-foreground pb-2 border-b border-foreground">
                        {currentEvent.venue && `${currentEvent.venue} - `}
                        Total Dietary Guests: {dietaryGuests.length}
                        {totalPages > 1 && ` - Page ${pageIndex + 1} of ${totalPages}`}
                        {` - Generated on: ${formatGeneratedTimestamp()}`}
                      </div>
                    </>
                  )}
                </div>

                {/* Guest Table */}
                <div
                  className={`flex-1 overflow-visible ${
                    settings.fontSize === 'small' ? 'print-font-small' : 
                    settings.fontSize === 'large' ? 'print-font-large' : 
                    'print-font-medium'
                  }`}
                  style={{ paddingTop: '4mm', paddingBottom: '12mm' }}
                >
                  <table>
                    <colgroup>
                      <col style={{ width: '16%' }} />
                      <col style={{ width: '14%' }} />
                      <col style={{ width: settings.showSeatNo ? '7%' : '10%' }} />
                      {settings.showSeatNo && <col style={{ width: '6%' }} />}
                      <col style={{ width: (settings.showMobile && settings.showRelation) ? '32%' : (settings.showMobile || settings.showRelation) ? '36%' : '48%' }} />
                      {settings.showMobile && <col style={{ width: '12%' }} />}
                      {settings.showRelation && <col style={{ width: '13%' }} />}
                    </colgroup>
                    <thead>
                      <tr>
                        <th>First Name</th>
                        <th>Last Name</th>
                        <th>Table</th>
                        {settings.showSeatNo && <th>Seat</th>}
                        <th>Dietary</th>
                        {settings.showMobile && <th>Mobile</th>}
                        {settings.showRelation && <th>Relation</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {pageGuests.map((guest, index) => (
                        <tr key={guest.id}>
                          <td className="font-bold">{guest.first_name}</td>
                          <td className="font-bold">{guest.last_name || '-'}</td>
                          <td>{guest.table_no || '-'}</td>
                          {settings.showSeatNo && <td>{guest.seat_no || '-'}</td>}
                          <td className="font-semibold text-accent-foreground">{guest.dietary}</td>
                          {settings.showMobile && <td>{guest.mobile || '-'}</td>}
                          {settings.showRelation && (
                            <td>
                              {computeRelationDisplay(
                                guest.relation_partner as any,
                                guest.relation_role as any,
                                currentEvent?.partner1_name,
                                currentEvent?.partner2_name,
                                []
                              ) || 'Guest'}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Footer with Logo */}
                {settings.showLogo && (
                  <div className="print-footer">
                    <img 
                      src={dietaryLogo} 
                      alt="Wedding Waitress"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
        </>
        )}
      </div>
    </>
  );
};
