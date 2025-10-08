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
import jsPDF from 'jspdf';
import { format } from 'date-fns';
import weddingWaitressLogo from '@/assets/wedding-waitress-new-logo.png';
import weddingWaitressLogoFull from '@/assets/wedding-waitress-logo-full.png';

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

  const formatGeneratedDate = () => {
    const date = new Date();
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
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
  const guestsPerPage = 22; // Fits well on A4 with header
  const totalPages = Math.ceil(dietaryGuests.length / guestsPerPage);
  const paginatedGuests = dietaryGuests.slice(
    (currentPage - 1) * guestsPerPage,
    currentPage * guestsPerPage
  );

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
        { label: 'Guest Name', width: 32, key: 'name', show: true },
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

        const fullName = `${guest.first_name} ${guest.last_name || ''}`.trim();
        const tableText = guest.table_no ? guest.table_no.toString() : '-';
        const seatText = guest.seat_no ? guest.seat_no.toString() : '-';
        const mobileText = guest.mobile || '-';
        const relationText = guest.relation_display || 'Guest';
        
        // Build data array based on visible columns
        const rowData = colData.map(col => {
          switch (col.key) {
            case 'name': return { text: fullName, width: col.width };
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
            pdf.addImage(weddingWaitressLogo, 'JPEG', pageWidth / 2 - 30, pageHeight - 25, 60, 15);
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
    window.print();
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
        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }

          * {
            visibility: hidden !important;
          }

          .print-page,
          .print-page * {
            visibility: visible !important;
          }

          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .print-page {
            position: relative !important;
            width: 210mm !important;
            height: 297mm !important;
            box-sizing: border-box !important;
            padding: 8mm 10mm 10mm 10mm !important;
            margin: 0 auto !important;
            background: white !important;
            break-after: page !important;
            page-break-after: always !important;
          }

          .print-page:last-of-type {
            break-after: auto !important;
            page-break-after: auto !important;
          }

          .print-page > *:first-child {
            margin-top: 0 !important;
          }

          .print-header-logo img {
            height: 48px !important;
            display: block;
            margin: 0 auto 4px auto !important;
          }

          .print-event-name {
            font-size: 20px !important;
            font-weight: 600 !important;
            color: #8B5CF6 !important;
            text-align: center !important;
            margin-bottom: 4px !important;
          }

          .print-chart-title {
            font-size: 15px !important;
            font-weight: 600 !important;
            text-align: center !important;
            margin-bottom: 2px !important;
          }

          .print-meta-line {
            font-size: 13px !important;
            text-align: center !important;
            margin-bottom: 6px !important;
            padding-bottom: 6px !important;
            border-bottom: 1px solid #000 !important;
          }

          .print-table {
            width: 100% !important;
            border-collapse: collapse !important;
            margin-top: 8px !important;
          }

          .print-table th,
          .print-table td {
            border: 1px solid #333 !important;
            padding: 8px 6px !important;
            text-align: left !important;
            font-size: 13px !important;
          }

          .print-table th {
            background-color: #f0f0f0 !important;
            font-weight: 600 !important;
          }

          .print-hide {
            display: none !important;
          }
        }
      `}</style>
      
      <div className="space-y-6 kitchen-dietary-chart">
        {/* Combined Header Card */}
        {currentEvent && (
          <Card className="ww-box print-hide">
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

              {/* Bottom Row: Event Info (Left) + Action Buttons (Right) */}
              <div className="flex items-start justify-between">
                {/* Left Side: Event Info */}
                <div className="space-y-1">
                  <h3 className="font-semibold text-lg">{currentEvent.name}</h3>
                  {currentEvent.date && (
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(currentEvent.date), 'EEEE, MMMM do, yyyy')}
                    </p>
                  )}
                  <div className="flex items-center gap-2 pt-1">
                    <Badge variant="secondary">
                      {dietaryGuests.length} Guest{dietaryGuests.length !== 1 ? 's' : ''}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      with dietary requirements
                    </span>
                  </div>
                </div>

                {/* Right Side: Action Buttons */}
                <div className="flex items-center gap-2">
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
          <div className="lg:col-span-1 print-hide">
            <DietaryChartCustomizer
              settings={settings}
              onSettingsChange={updateSettings}
            />
          </div>

          {/* A4 Page Display (Right - 3 columns) */}
          <div className="lg:col-span-3 print-hide">
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
                      width: '794px', 
                      height: '1123px',
                      minWidth: '794px',
                      maxWidth: '794px'
                    }}
                  >
                    <div className="p-[45px] h-full flex flex-col">
                      {/* Header */}
                      <div className="text-center space-y-2 mb-6">
                        {/* Logo */}
                        {settings.showLogo && (
                          <div className="flex justify-center mb-3">
                            <img 
                              src={weddingWaitressLogoFull} 
                              alt="Wedding Waitress" 
                              className="h-12 object-contain"
                            />
                          </div>
                        )}

                        {/* Event Name */}
                        {currentEvent && (
                          <>
                            <h1 className="text-xl font-semibold" style={{ color: '#8B5CF6' }}>
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
                              {` - Generated on: ${formatGeneratedDate()}`}
                            </div>
                          </>
                        )}
                      </div>

                      {/* Guest Table */}
                      <div className={`flex-1 overflow-hidden ${getFontSizeClass()}`}>
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="border-b-2 border-foreground">
                              <th className="text-left py-2 px-2 font-semibold">Guest Name</th>
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
                                  {guest.first_name} {guest.last_name}
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
        <div className="hidden print:block">
          {Array.from({ length: totalPages }, (_, pageIndex) => {
            const pageGuests = dietaryGuests.slice(
              pageIndex * guestsPerPage,
              (pageIndex + 1) * guestsPerPage
            );
            
            return (
              <div key={pageIndex} className="print-page">
                {/* Header */}
                <div className="text-center space-y-1 mb-4">
                  {/* Logo */}
                  {settings.showLogo && (
                    <div className="print-header-logo">
                      <img 
                        src={weddingWaitressLogoFull} 
                        alt="Wedding Waitress"
                      />
                    </div>
                  )}

                  {/* Event Name */}
                  {currentEvent && (
                    <>
                      <div className="print-event-name">
                        {currentEvent.name}
                      </div>

                      {/* Chart Title and Date */}
                      <div className="print-chart-title">
                        Kitchen Dietary Requirements
                        {currentEvent.date && ` - ${formatDateWithOrdinal(currentEvent.date)}`}
                      </div>

                      {/* Meta Line */}
                      <div className="print-meta-line">
                        {currentEvent.venue && `${currentEvent.venue} - `}
                        Total Dietary Guests: {dietaryGuests.length}
                        {totalPages > 1 && ` - Page ${pageIndex + 1} of ${totalPages}`}
                        {` - Generated on: ${formatGeneratedDate()}`}
                      </div>
                    </>
                  )}
                </div>

                {/* Guest Table */}
                <table className="print-table">
                  <thead>
                    <tr>
                      <th>Guest Name</th>
                      <th>Table</th>
                      {settings.showSeatNo && <th>Seat</th>}
                      <th>Dietary</th>
                      {settings.showMobile && <th>Mobile</th>}
                      {settings.showRelation && <th>Relation</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {pageGuests.map((guest) => (
                      <tr key={guest.id}>
                        <td>{guest.first_name} {guest.last_name}</td>
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
            );
          })}
        </div>
      </div>
    </>
  );
};
