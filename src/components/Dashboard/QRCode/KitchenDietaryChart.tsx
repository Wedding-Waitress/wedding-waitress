/**
 * ⚠️ PRODUCTION-READY - DO NOT MODIFY WITHOUT APPROVAL
 * Last verified working: 2025-10-04
 * Contains: Kitchen dietary requirements chart with PDF export and print functionality
 * Status: Fully tested and production-ready
 * Features: Dietary requirements display, PDF export with custom spacing, print view, Wedding Waitress branding
 */

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, ChefHat, AlertCircle, ChevronLeft, ChevronRight, Printer } from 'lucide-react';
import { useRealtimeGuests } from '@/hooks/useRealtimeGuests';
import { useEvents } from '@/hooks/useEvents';
import { useTables } from '@/hooks/useTables';
import { useDietaryChartSettings } from '@/hooks/useDietaryChartSettings';
import { DietaryChartCustomizer } from './DietaryChartCustomizer';
import { useToast } from '@/hooks/use-toast';
import { exportDietaryChartToDocx } from '@/lib/dietaryChartDocxExporter';
import { exportDietaryChartToPdf } from '@/lib/dietaryChartPdfExporter';
import { format } from 'date-fns';
import dietaryLogo from '@/assets/wedding-waitress-dietary-logo.png';
import { computeRelationDisplay } from '@/lib/relationUtils';
import { Event } from '@/hooks/useEvents';
import { Calendar } from 'lucide-react';

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
    const date = new Date(dateString);
    const day = date.getDate();
    const ordinal = getOrdinalSuffix(day);
    const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
    const month = date.toLocaleDateString('en-US', { month: 'long' });
    const year = date.getFullYear();
    return `${weekday}, ${day}${ordinal}, ${month} ${year}`;
  };

  const formatGeneratedTimestamp = () => {
    const now = new Date();
    
    // Format date in DD/MM/YYYY format
    const dateStr = now.toLocaleDateString('en-GB');
    
    // Format time in 12-hour format with AM/PM
    const timeStr = now.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true 
    });
    
    return `${dateStr} Time: ${timeStr}`;
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
      .map(guest => ({
        id: guest.id,
        first_name: guest.first_name,
        last_name: guest.last_name,
        table_no: guest.table_no,
        seat_no: guest.seat_no,
        dietary: guest.dietary,
        relation_partner: guest.relation_partner,
        relation_role: guest.relation_role,
        mobile: guest.mobile
      }));

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
      } else {
        // firstName (default)
        return a.first_name.localeCompare(b.first_name);
      }
    });
  }, [guests, settings.sortBy]);

  // Pagination logic - calculate guests per page for A4
  const guestsPerPage = useMemo(() => {
    // Fixed: Always show exactly 20 guests per page regardless of font size
    return 20;
  }, []);

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

  // PDF Export functionality
  const handleDownloadPdf = async () => {
    if (!currentEvent || dietaryGuests.length === 0) return;
    
    setIsExporting(true);
    try {
      toast({
        title: 'Generating PDF',
        description: 'Creating your dietary chart...',
      });

      await exportDietaryChartToPdf(currentEvent, dietaryGuests, settings);

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

  // Word Export functionality
  const handleDownloadWord = async () => {
    if (!currentEvent || dietaryGuests.length === 0) return;
    
    setIsExporting(true);
    try {
      toast({
        title: 'Generating Word Document',
        description: 'Creating your dietary chart...',
      });

      await exportDietaryChartToDocx(currentEvent, dietaryGuests, settings);

      toast({
        title: 'Word Document Downloaded',
        description: 'Your dietary chart has been saved',
      });
    } catch (error) {
      console.error('DOCX export error:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to generate Word document',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    if (!currentEvent || dietaryGuests.length === 0) return;
    
    toast({
      title: 'Opening Print Dialog',
      description: 'Preparing dietary chart for printing...',
    });
    
    // Small delay to show toast before print dialog
    setTimeout(() => {
      window.print();
    }, 500);
  };

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
          
          /* Print-specific table styling */
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
        {/* Combined Header Card */}
        {currentEvent && (
          <Card className="ww-box print:hidden">
            <CardContent className="p-6">
              {/* Top Row: Event Selector (Left) + Title & Description (Right) */}
              <div className="flex items-start justify-between gap-6">
                {/* Left Side: Event Selector */}
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium whitespace-nowrap">Choose Event:</span>
                  <Select value={eventId || "no-event"} onValueChange={handleEventSelect}>
                    <SelectTrigger className="w-[300px] border-primary focus:ring-primary">
                      <SelectValue placeholder="Choose Event" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border z-50">
                      {events.map(event => (
                        <SelectItem key={event.id} value={event.id}>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>{event.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Right Side: Title and Description */}
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <ChefHat className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold gradient-text">Kitchen Dietary Requirements</h2>
                    <p className="text-muted-foreground text-sm">
                      Staff reference sheet for guests with dietary requirements and allergies
                    </p>
                  </div>
                </div>
              </div>

              <Separator className="my-4" />

              {/* Bottom Row: Single line with Event Info + Buttons */}
              <div className="flex items-center justify-between gap-4">
                {/* Left Side: Event Info on one line */}
                <div className="flex items-center gap-2 text-sm flex-wrap">
                  <span className="font-semibold text-primary text-base">
                    {currentEvent.name}
                  </span>
                  {currentEvent.date && (
                    <>
                      <span className="text-muted-foreground">-</span>
                      <span className="text-muted-foreground">
                        {format(new Date(currentEvent.date), 'EEEE, MMMM do, yyyy')}
                      </span>
                    </>
                  )}
                  <span className="text-muted-foreground">-</span>
                  <span className="text-muted-foreground">
                    {dietaryGuests.length} Guest{dietaryGuests.length !== 1 ? 's' : ''} with dietary requirements
                  </span>
                </div>

                {/* Right Side: Action Buttons */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleDownloadPdf}
                    disabled={isExporting || dietaryGuests.length === 0}
                  >
                    <FileText className="w-4 h-4" />
                    Download PDF
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleDownloadWord}
                    disabled={isExporting || dietaryGuests.length === 0}
                  >
                    <FileText className="w-4 h-4" />
                    Download Word
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handlePrint}
                    disabled={isExporting || dietaryGuests.length === 0}
                  >
                    <Printer className="w-4 h-4" />
                    Print
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content Grid: Settings + A4 Display */}
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
                  className="bg-white border border-gray-300 shadow-lg"
                    style={{ 
                      width: '210mm', 
                      height: '297mm',
                      minWidth: '210mm',
                      maxWidth: '210mm'
                    }}
                  >
                    <div style={{ padding: '1.27cm' }} className="h-full flex flex-col">
                      {/* Header */}
                      <div className="text-center space-y-2 mb-[4mm]">
                        {/* Event Name */}
                        {currentEvent && (
                          <>
                            <h1 className="text-base font-bold" style={{ color: '#6D28D9' }}>
                              {currentEvent.name}
                            </h1>

                            {/* Chart Title and Date */}
                            <h2 className="font-bold text-xs text-foreground">
                              Kitchen Dietary Requirements
                              {currentEvent.date && ` - ${formatDateWithOrdinal(currentEvent.date)}`}
                            </h2>

                            {/* Meta Line */}
                            <div className="meta-line text-sm text-foreground pb-2 border-b border-foreground">
                              {currentEvent.venue && `${currentEvent.venue} - `}
                              Total Dietary Guests: {dietaryGuests.length}
                              {totalPages > 1 && ` - Page ${currentPage} of ${totalPages}`}
                              {` - Generated on: ${formatGeneratedTimestamp()}`}
                            </div>
                          </>
                        )}
                      </div>

                      {/* Guest Table */}
                      <div className={`flex-1 overflow-hidden ${getFontSizeClass()} mt-4`}>
                        <table className="w-full border-collapse mt-0">
                          <thead>
                            <tr className="border-b-2 border-foreground">
                              <th className="text-left py-[1pt] px-[4pt] font-semibold">First Name</th>
                              <th className="text-left py-[1pt] px-[4pt] font-semibold">Last Name</th>
                              <th className="text-left py-[1pt] px-[4pt] font-semibold">Table</th>
                              {settings.showSeatNo && (
                                <th className="text-left py-[1pt] px-[4pt] font-semibold">Seat</th>
                              )}
                              <th className="text-left py-[1pt] px-[4pt] font-semibold">Dietary</th>
                              {settings.showMobile && (
                                <th className="text-left py-[1pt] px-[4pt] font-semibold">Mobile</th>
                              )}
                              {settings.showRelation && (
                                <th className="text-left py-[1pt] px-[4pt] font-semibold">Relation</th>
                              )}
                            </tr>
                          </thead>
                          <tbody>
                            {paginatedGuests.map((guest, index) => (
                              <tr 
                                key={guest.id}
                                className={index % 2 === 0 ? 'bg-[#f9fafb]' : 'bg-white'}
                              >
                                <td className="py-[4pt] px-[4pt] border-b border-gray-200 font-bold">
                                  {guest.first_name}
                                </td>
                                <td className="py-[4pt] px-[4pt] border-b border-gray-200 font-bold">
                                  {guest.last_name || '-'}
                                </td>
                                <td className="py-[4pt] px-[4pt] border-b border-gray-200">
                                  {guest.table_no || '-'}
                                </td>
                                {settings.showSeatNo && (
                                  <td className="py-[4pt] px-[4pt] border-b border-gray-200">
                                    {guest.seat_no || '-'}
                                  </td>
                                )}
                                <td className="py-[4pt] px-[4pt] border-b border-gray-200 font-semibold text-accent-foreground">
                                  {guest.dietary}
                                </td>
                                {settings.showMobile && (
                                  <td className="py-[4pt] px-[4pt] border-b border-gray-200">
                                    {guest.mobile || '-'}
                                  </td>
                                )}
                                {settings.showRelation && (
                                  <td className="py-[4pt] px-[4pt] border-b border-gray-200">
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
                        <div className="mt-auto pt-4 flex justify-center">
                          <img 
                  src={dietaryLogo}
                            alt="Wedding Waitress" 
                            style={{ height: '10.5mm', width: 'auto', objectFit: 'contain' }}
                          />
                        </div>
                      )}
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
      </div>
    </>
  );
};
