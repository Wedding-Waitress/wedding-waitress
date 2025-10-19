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
import { Download, Printer, ChefHat, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useRealtimeGuests } from '@/hooks/useRealtimeGuests';
import { useEvents } from '@/hooks/useEvents';
import { useTables } from '@/hooks/useTables';
import { useDietaryChartSettings } from '@/hooks/useDietaryChartSettings';
import { DietaryChartCustomizer } from './DietaryChartCustomizer';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import { format } from 'date-fns';
import dietaryLogo from '@/assets/wedding-waitress-dietary-logo.png';

interface KitchenDietaryChartProps {
  eventId: string;
}

interface DietaryGuest {
  id: string;
  first_name: string;
  last_name: string;
  table_no: number | null;
  seat_no: number | null;
  dietary: string;
  relation_display: string;
  mobile: string | null;
}

export const KitchenDietaryChart: React.FC<KitchenDietaryChartProps> = ({ eventId }) => {
  const [selectedEventId, setSelectedEventId] = useState(eventId);
  const { guests, loading: guestsLoading } = useRealtimeGuests(selectedEventId);
  const { events, loading: eventsLoading } = useEvents();
  const { tables, loading: tablesLoading } = useTables(selectedEventId);
  const { settings, loading: settingsLoading, updateSettings } = useDietaryChartSettings(selectedEventId);
  const [isExporting, setIsExporting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [printToastShown, setPrintToastShown] = useState(false);
  const { toast } = useToast();

  const currentEvent = events.find(event => event.id === selectedEventId);

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
        relation_display: guest.relation_display,
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
    let base = settings.fontSize === 'small' ? 22 : settings.fontSize === 'large' ? 18 : 20;
    if (settings.showLogo) base -= 1; // header is taller when logo is shown
    return Math.max(12, base); // safety floor
  }, [settings.fontSize, settings.showLogo]);

  const totalPages = Math.ceil(dietaryGuests.length / guestsPerPage);
  const paginatedGuests = useMemo(() => {
    const start = (currentPage - 1) * guestsPerPage;
    return dietaryGuests.slice(start, start + guestsPerPage);
  }, [dietaryGuests, currentPage, guestsPerPage]);

  // Reset to page 1 when event changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [selectedEventId]);

  // Font size mapping
  const getFontSizeClass = () => {
    switch (settings.fontSize) {
      case 'small': return 'text-sm';
      case 'large': return 'text-lg';
      default: return 'text-base';
    }
  };

  const handleExportPDF = async () => {
    if (!currentEvent || dietaryGuests.length === 0) return;

    setIsExporting(true);
    try {
      // Determine PDF size based on settings
      const paperSizes: Record<string, [number, number]> = {
        'A4': [210, 297],
        'A3': [297, 420],
        'A2': [420, 594],
        'A1': [594, 841],
      };
      const [width, height] = paperSizes[settings.paperSize] || paperSizes['A4'];
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [width, height]
      });
      
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      // Header
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(124, 58, 237); // #7C3AED
      pdf.text(currentEvent.name, pageWidth / 2, 20, { align: 'center' });
      
      if (currentEvent.date) {
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'normal');
        const eventDate = formatDateWithOrdinal(currentEvent.date);
        pdf.text(eventDate, pageWidth / 2, 30, { align: 'center' });
      }

      // Table headers with dynamic columns based on settings
      let yPosition = 50;
      const baseFontSize = settings.fontSize === 'small' ? 10 : settings.fontSize === 'large' ? 14 : 12;
      pdf.setFontSize(baseFontSize);
      pdf.setFont('helvetica', 'bold');
      
      // Build column configuration based on settings
      const columns = [
        { label: 'First Name', width: 20, key: 'firstName', show: true },
        { label: 'Last Name', width: 20, key: 'lastName', show: true },
        { label: 'Table', width: 15, key: 'table', show: true },
        { label: 'Seat', width: 15, key: 'seat', show: settings.showSeatNo },
        { label: 'Dietary', width: 42, key: 'dietary', show: true },
        { label: 'Mobile', width: 32, key: 'mobile', show: settings.showMobile },
        { label: 'Relation', width: 38, key: 'relation', show: settings.showRelation },
      ].filter(col => col.show);
      
      // Calculate column positions
      let currentX = 10;
      const colData = columns.map(col => {
        const pos = currentX;
        currentX += col.width + 3;
        return { ...col, position: pos };
      });
      
      // Draw headers
      colData.forEach(col => {
        pdf.text(col.label, col.position, yPosition);
      });
      
      // Draw line under headers
      yPosition += 5;
      pdf.line(10, yPosition, pageWidth - 10, yPosition);
      yPosition += 10;

      // Guest data
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(baseFontSize - 1);

      dietaryGuests.forEach((guest, index) => {
        if (yPosition > pageHeight - 40) {
          pdf.addPage();
          yPosition = 20;
        }

        const tableText = guest.table_no ? guest.table_no.toString() : '-';
        const seatText = guest.seat_no ? guest.seat_no.toString() : '-';
        const mobileText = guest.mobile || '-';
        const relationText = guest.relation_display || 'Guest';
        
        // Build data array based on visible columns
        const rowData = colData.map(col => {
          switch (col.key) {
            case 'firstName': return { text: guest.first_name, width: col.width };
            case 'lastName': return { text: guest.last_name || '-', width: col.width };
            case 'table': return { text: tableText, width: col.width };
            case 'seat': return { text: seatText, width: col.width };
            case 'dietary': return { text: guest.dietary, width: col.width };
            case 'mobile': return { text: mobileText, width: col.width };
            case 'relation': return { text: relationText, width: col.width };
            default: return { text: '', width: col.width };
          }
        });
        
        // Draw each cell with text wrapping
        const wrappedLines = rowData.map(data => pdf.splitTextToSize(data.text, data.width));
        const maxLines = Math.max(...wrappedLines.map(lines => lines.length));
        
        rowData.forEach((data, idx) => {
          pdf.text(wrappedLines[idx], colData[idx].position, yPosition);
        });
        
        yPosition += maxLines * (baseFontSize / 2 + 2) + 4;

        // Add separator line every few entries
        if ((index + 1) % 3 === 0) {
          pdf.setDrawColor(220, 220, 220);
          pdf.line(10, yPosition, pageWidth - 10, yPosition);
          yPosition += 3;
        }
      });

      // Footer with optional logo
      const pdfTotalPages = pdf.getNumberOfPages();
      for (let i = 1; i <= pdfTotalPages; i++) {
        pdf.setPage(i);
        
        // Wedding Waitress logo (only if showLogo is enabled)
        if (settings.showLogo) {
          try {
            pdf.addImage(dietaryLogo, 'PNG', pageWidth / 2 - 30, pageHeight - 25, 60, 15);
          } catch (error) {
            console.warn('Could not add logo to PDF:', error);
          }
        }
        
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'italic');
        pdf.text(
          `Kitchen Dietary Requirements | Page ${i} of ${pdfTotalPages}`,
          pageWidth / 2,
          pageHeight - 5,
          { align: 'center' }
        );
      }

      pdf.save(`kitchen-dietary-requirements-${currentEvent.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    if (!printToastShown) {
      toast({
        title: "Print Settings Tip",
        description: "For perfect output: in the print dialog turn OFF 'Headers and footers' and turn ON 'Background graphics'.",
        duration: 8000,
      });
      setPrintToastShown(true);
    }
    
    const originalTitle = document.title;
    document.title = '';
    
    requestAnimationFrame(() => {
      setTimeout(() => {
        window.print();
        setTimeout(() => {
          document.title = originalTitle;
        }, 100);
      }, 0);
    });
  };

  if (guestsLoading || eventsLoading) {
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
            padding: 10mm;
            display: flex;
            flex-direction: column;
            background-color: white !important;
            box-sizing: border-box;
            page-break-after: always;
            page-break-inside: avoid;
          }
          
          .print-page:last-child {
            page-break-after: auto;
          }
          
          /* Print-specific table styling */
          .print-page table {
            width: 100%;
            border-collapse: collapse;
          }
          
          .print-page table thead tr {
            border-bottom: 2px solid #000;
          }
          
          .print-page table th {
            text-align: left;
            padding: 4pt 4pt;
            font-weight: 600;
          }
          
          .print-page table td {
            padding: 4pt 4pt;
            border-bottom: 1px solid #e5e7eb;
            page-break-inside: avoid;
            word-wrap: break-word;
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
            margin-bottom: 3mm;
          }
          
          .print-page table {
            margin-top: 10mm;
          }
          
          .print-page .print-footer {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            display: flex;
            justify-content: center;
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
                  <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                    <SelectTrigger className="w-full max-w-md">
                      <SelectValue placeholder="Select an event..." />
                    </SelectTrigger>
                    <SelectContent>
                      {events.map(event => (
                        <SelectItem key={event.id} value={event.id}>
                          {event.name}
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
                  <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
                    <Printer className="w-4 h-4" />
                    Print
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleExportPDF}
                    disabled={isExporting || dietaryGuests.length === 0}
                    className="gap-2"
                  >
                    <Download className="w-4 h-4" />
                    {isExporting ? 'Downloading...' : 'Download PDF'}
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
                    <div style={{ padding: '10mm' }} className="h-full flex flex-col">
                      {/* Header */}
                      <div className="text-center space-y-2 mb-6">
                        {/* Event Name */}
                        {currentEvent && (
                          <>
                            <h1 className="text-xl font-semibold" style={{ color: '#7C3AED' }}>
                              {currentEvent.name}
                            </h1>

                            {/* Chart Title and Date */}
                            <h2 className={`font-semibold text-foreground ${getFontSizeClass()}`}>
                              Kitchen Dietary Requirements
                              {currentEvent.date && ` - ${formatDateWithOrdinal(currentEvent.date)}`}
                            </h2>

                            {/* Meta Line */}
                            <div className="text-sm text-foreground pb-2 border-b border-foreground">
                              {currentEvent.venue && `${currentEvent.venue} - `}
                              Total Dietary Guests: {dietaryGuests.length}
                              {totalPages > 1 && ` - Page ${currentPage} of ${totalPages}`}
                              {` - Generated on: ${formatGeneratedTimestamp()}`}
                            </div>
                          </>
                        )}
                      </div>

                      {/* Guest Table */}
                      <div className={`flex-1 overflow-hidden ${getFontSizeClass()}`}>
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="border-b-2 border-foreground">
                              <th className="text-left py-2 px-2 font-semibold">First Name</th>
                              <th className="text-left py-2 px-2 font-semibold">Last Name</th>
                              <th className="text-left py-2 px-2 font-semibold">Table</th>
                              {settings.showSeatNo && (
                                <th className="text-left py-2 px-2 font-semibold">Seat</th>
                              )}
                              <th className="text-left py-2 px-2 font-semibold">Dietary</th>
                              {settings.showMobile && (
                                <th className="text-left py-2 px-2 font-semibold">Mobile</th>
                              )}
                              {settings.showRelation && (
                                <th className="text-left py-2 px-2 font-semibold">Relation</th>
                              )}
                            </tr>
                          </thead>
                          <tbody>
                            {paginatedGuests.map((guest, index) => (
                              <tr 
                                key={guest.id}
                                className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}
                              >
                                <td className="py-2 px-2 border-b">
                                  {guest.first_name}
                                </td>
                                <td className="py-2 px-2 border-b">
                                  {guest.last_name || '-'}
                                </td>
                                <td className="py-2 px-2 border-b">
                                  {guest.table_no || '-'}
                                </td>
                                {settings.showSeatNo && (
                                  <td className="py-2 px-2 border-b">
                                    {guest.seat_no || '-'}
                                  </td>
                                )}
                                <td className="py-2 px-2 border-b font-semibold">
                                  {guest.dietary}
                                </td>
                                {settings.showMobile && (
                                  <td className="py-2 px-2 border-b">
                                    {guest.mobile || '-'}
                                  </td>
                                )}
                                {settings.showRelation && (
                                  <td className="py-2 px-2 border-b">
                                    {guest.relation_display || 'Guest'}
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
                      <div className="text-sm text-foreground pb-2 border-b border-foreground">
                        {currentEvent.venue && `${currentEvent.venue} - `}
                        Total Dietary Guests: {dietaryGuests.length}
                        {totalPages > 1 && ` - Page ${pageIndex + 1} of ${totalPages}`}
                        {` - Generated on: ${formatGeneratedTimestamp()}`}
                      </div>
                    </>
                  )}
                </div>

                {/* Guest Table */}
                <div className={`flex-1 overflow-hidden ${
                  settings.fontSize === 'small' ? 'print-font-small' : 
                  settings.fontSize === 'large' ? 'print-font-large' : 
                  'print-font-medium'
                }`}>
                  <table>
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
                          <td>{guest.first_name}</td>
                          <td>{guest.last_name || '-'}</td>
                          <td>{guest.table_no || '-'}</td>
                          {settings.showSeatNo && <td>{guest.seat_no || '-'}</td>}
                          <td style={{ fontWeight: 600 }}>{guest.dietary}</td>
                          {settings.showMobile && <td>{guest.mobile || '-'}</td>}
                          {settings.showRelation && <td>{guest.relation_display || 'Guest'}</td>}
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
