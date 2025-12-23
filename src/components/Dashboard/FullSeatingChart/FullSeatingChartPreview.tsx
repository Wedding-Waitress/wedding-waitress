/**
 * ============================================================================
 * 🔒 PRODUCTION LOCKED - DO NOT MODIFY 🔒
 * ============================================================================
 * 
 * ⚠️ THIS COMPONENT IS LOCKED FOR PRODUCTION USE ⚠️
 * 
 * ANY MODIFICATIONS TO THIS FILE REQUIRE EXPLICIT WRITTEN APPROVAL FROM OWNER
 * Print measurements have been precisely calibrated. Changes will break layouts.
 * 
 * This component renders the Full Seating Chart preview with screen and print
 * versions, using exact A4 dimensions and carefully calibrated spacing.
 * 
 * CRITICAL MEASUREMENTS (DO NOT CHANGE):
 * - A4 dimensions: 794px × 1123px (210mm × 297mm at 96 DPI)
 * - Page margins: 45px (12mm)
 * - Header height: 120px minimum
 * - Guest list height: 913px available
 * - Column gap: 12mm
 * - Guests per column: 10
 * - Guests per page: 20
 * 
 * PRINT SPECIFICATIONS:
 * - Paper size: A4 portrait
 * - Margins: 12mm
 * - Logo height: 48px (screen), appropriate print size
 * - Font sizes: Configurable via settings (small/medium/large)
 * 
 * FEATURES:
 * - Interactive checkboxes for guest check-off
 * - Multi-page pagination support
 * - Professional print layout with exact measurements
 * - Optional dietary and relationship display
 * - Date formatting with ordinal suffixes
 * 
 * Last locked: 2025-10-19
 * Status: PRODUCTION READY - NO CHANGES ALLOWED
 * ============================================================================
 */

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Guest } from '@/hooks/useGuests';
import { FullSeatingChartSettings } from '@/hooks/useFullSeatingChartSettings';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import weddingWaitressLogoFull from '@/assets/wedding-waitress-logo-full.png';

interface FullSeatingChartPreviewProps {
  event: any;
  guests: Guest[];
  settings: FullSeatingChartSettings;
  guestsPerPage?: number; // Auto-fit from parent
}

export const FullSeatingChartPreview: React.FC<FullSeatingChartPreviewProps> = ({
  event,
  guests,
  settings,
  guestsPerPage: propGuestsPerPage
}) => {
  const [checkedGuests, setCheckedGuests] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);

  // AUTOFIT: Dynamic pagination based on font size
  const paginationInfo = useMemo(() => {
    // Use passed guestsPerPage or calculate based on font size
    const GUESTS_PER_PAGE = propGuestsPerPage || (() => {
      const availableHeight = 228; // mm for guest rows
      const rowHeightByFontSize: Record<string, number> = {
        'small': 6,
        'medium': 6.5,
        'large': 7.5
      };
      const rowHeight = rowHeightByFontSize[settings.fontSize] || 6.5;
      const guestsPerColumn = Math.floor(availableHeight / rowHeight);
      return guestsPerColumn * 2;
    })();
    
    const GUESTS_PER_COLUMN = Math.ceil(GUESTS_PER_PAGE / 2);
    
    interface PageInfo {
      guests: Guest[];
      col1Count: number;
      startIndex: number;
      endIndex: number;
    }
    
    const pages: PageInfo[] = [];
    
    for (let i = 0; i < guests.length; i += GUESTS_PER_PAGE) {
      const pageGuests = guests.slice(i, i + GUESTS_PER_PAGE);
      const col1Count = Math.min(GUESTS_PER_COLUMN, pageGuests.length);
      
      pages.push({
        guests: pageGuests,
        col1Count,
        startIndex: i,
        endIndex: i + pageGuests.length
      });
    }
    
    return { pages, guestsPerColumn: GUESTS_PER_COLUMN };
  }, [guests, settings.fontSize, propGuestsPerPage]);

  const totalPages = paginationInfo.pages.length;
  const currentPageInfo = paginationInfo.pages[currentPage - 1] || { guests: [], col1Count: 0 };
  const currentGuests = currentPageInfo.guests;
  const col1Guests = currentGuests.slice(0, currentPageInfo.col1Count);
  const col2Guests = currentGuests.slice(currentPageInfo.col1Count);

  const formatGuestName = (guest: Guest) => {
    if (settings.sortBy === 'lastName') {
      return `${guest.last_name || ''}, ${guest.first_name}`.trim();
    }
    return `${guest.first_name} ${guest.last_name || ''}`.trim();
  };

  // Get font size class based on settings
  const getFontSizeClass = () => {
    switch (settings.fontSize) {
      case 'small': return 'text-sm';
      case 'large': return 'text-lg';
      default: return 'text-base';
    }
  };

  // Get print font sizes based on settings (in points for true-to-size printing)
  const getPrintFontSizes = () => {
    switch (settings.fontSize) {
      case 'small': return { main: '10.5pt', checkbox: '9pt' };
      case 'large': return { main: '13.5pt', checkbox: '12pt' };
      default: return { main: '12pt', checkbox: '10.5pt' }; // medium
    }
  };

  const printFontSizes = getPrintFontSizes();

  // Safety check: return null if event is not provided
  if (!event) {
    return null;
  }

  const handleGuestCheck = (guestId: string, checked: boolean) => {
    const newChecked = new Set(checkedGuests);
    if (checked) {
      newChecked.add(guestId);
    } else {
      newChecked.delete(guestId);
    }
    setCheckedGuests(newChecked);
  };

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

  // Screen version guest row
  const ScreenGuestRow = ({ guest }: { guest: Guest }) => (
    <div className="flex items-center gap-3 py-0.5 px-1 hover:bg-muted/30 rounded-sm">
      <Checkbox
        id={`guest-${guest.id}`}
        checked={checkedGuests.has(guest.id)}
        onCheckedChange={(checked) => handleGuestCheck(guest.id, checked === true)}
        className="w-4 h-4"
      />
      <div className="flex-1 min-w-0">
        <div className={`font-bold ${getFontSizeClass()} text-foreground`}>
          {formatGuestName(guest)}
        </div>
        {settings.showDietary && guest.dietary && guest.dietary !== 'NA' && (
          <div className="text-xs text-muted-foreground mt-0.5">
            Dietary: {guest.dietary}
          </div>
        )}
        {settings.showRelation && guest.relation_display && (
          <div className="text-xs text-muted-foreground mt-0.5">
            {guest.relation_display}
          </div>
        )}
      </div>
      <div className="flex-shrink-0">
        <span className={`font-bold ${getFontSizeClass()} px-2 py-1 bg-muted rounded`}>
          {guest.table_no ? `Table ${guest.table_no}` : 'Unassigned'}
        </span>
      </div>
    </div>
  );

  // Print version guest row - matches screen layout exactly
  const PrintGuestRow = ({ guest }: { guest: Guest }) => (
    <div className="print-guest-item">
      <span className="print-checkbox">☐</span>
      <div className="print-guest-details">
        <div className="print-guest-name">{formatGuestName(guest)}</div>
        {settings.showDietary && guest.dietary && guest.dietary !== 'NA' && (
          <div className="print-dietary">Dietary: {guest.dietary}</div>
        )}
        {settings.showRelation && guest.relation_display && (
          <div className="print-relation">{guest.relation_display}</div>
        )}
      </div>
      <span className="print-table">
        {guest.table_no ? `Table ${guest.table_no}` : 'Unassigned'}
      </span>
    </div>
  );

  return (
    <>
      {/* Print Styles - Must be at component root */}
      <style>{`
        @page {
          size: A4 portrait;
          margin: 0; /* Remove browser headers/footers */
        }
        
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          html, body {
            margin: 0;
            padding: 0;
            background: white !important;
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
          }
          
        .print-header {
          text-align: center;
          margin-bottom: 3mm;
        }

        .print-footer {
          flex-shrink: 0;
          min-height: 15mm;
          display: flex;
          justify-content: center;
          align-items: center;
          margin-top: auto;
        }

        .print-footer img {
          height: 10.5mm;
          width: auto;
          object-fit: contain;
        }

        .print-event-name {
          font-size: 20px;
          font-weight: bold;
          margin: 0 0 4px 0;
          color: #7C3AED;
        }

        .print-chart-date {
          font-size: 15px;
          font-weight: 600;
          margin: 0 0 4px 0;
          color: #000;
        }
          
          .print-subtitle {
            font-size: 13px;
            margin: 0 0 8px 0;
            color: #000;
            padding-bottom: 8px;
            border-bottom: 1px solid #000;
          }

          .print-column-header {
            font-size: 11pt;
            font-weight: bold;
            color: #000;
            text-transform: uppercase;
            margin-bottom: 8px;
          }
          
          .print-guest-list {
            flex: 1;
            display: grid;
            grid-template-columns: 1fr 1fr;
            column-gap: 12mm;
            align-items: start;
            margin-top: 0;
            overflow: hidden;
          }
          
          .print-guest-column {
            display: flex;
            flex-direction: column;
          }
          
          .print-guest-item {
            display: flex;
            align-items: flex-start;
            gap: 8px;
            break-inside: avoid;
            font-size: ${printFontSizes.main};
            line-height: 1.2;
            margin-bottom: 0px;
            color: #000;
            padding: 2px 2px;
          }
          
          .print-checkbox {
            font-family: monospace;
            font-size: ${printFontSizes.checkbox};
            flex-shrink: 0;
            padding-top: 1px;
          }
          
          .print-guest-details {
            flex: 1;
            min-width: 0;
          }
          
          .print-guest-name {
            font-weight: 700;
            color: #000;
          }
          
          .print-dietary {
            font-size: ${printFontSizes.checkbox};
            color: #666;
            margin-top: 1px;
          }
          
          .print-relation {
            font-size: ${printFontSizes.checkbox};
            color: #666;
            margin-top: 1px;
          }
          
          .print-table {
            font-weight: 700;
            background-color: #f3f4f6;
            padding: 2px 8px;
            border-radius: 4px;
            white-space: nowrap;
            flex-shrink: 0;
          }
          
        }
      `}</style>

      {/* Screen Version - A4 Paper Preview */}
      <div className="print:hidden">
        {/* Page Navigation Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mb-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>
            <div className="text-sm font-medium">
              Page {currentPage} of {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}

        {/* A4 Paper Container - True A4 size: 210mm × 297mm */}
        <div className="flex justify-center">
          <div 
            className="bg-white border border-gray-300 shadow-lg overflow-hidden"
            style={{ 
              width: '210mm', 
              height: '297mm',
              minWidth: '210mm',
              maxWidth: '210mm'
            }}
          >
            {/* Content with 1.27cm margins all around (narrow margins) */}
            <div style={{ padding: '1.27cm' }} className="h-full flex flex-col">
              {/* Header */}
              <div className="text-center mb-4">
                {/* Line 1: Event Name */}
                <h1 className="text-base font-bold mb-0.5" style={{ color: '#6D28D9' }}>
                  {event.name}
                </h1>
                
                {/* Line 2: Chart Type + Date */}
                <p className="text-xs font-bold text-foreground mb-0.5">
                  Full Seating Chart - {event.date && formatDateWithOrdinal(event.date)}
                </p>
                
                {/* Line 3: Venue + Stats + Page + Generated */}
                <p className="text-sm text-foreground pb-2 mb-2 border-b border-black">
                  {event.venue} - Total Guests: {guests.length} - Page {currentPage} of {totalPages} - Generated on: {formatGeneratedTimestamp()}
                </p>
              </div>

              {/* Guest List */}
              <div className="flex-1" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: '12mm' }}>
                {/* Left Column */}
                <div className="space-y-1">
                  {col1Guests.length > 0 && (
                    <>
                      <h3 className="font-semibold text-xs text-muted-foreground mb-2 uppercase tracking-wide">
                        Guests {paginationInfo.pages.slice(0, currentPage - 1).reduce((sum, p) => sum + p.guests.length, 0) + 1}-{paginationInfo.pages.slice(0, currentPage - 1).reduce((sum, p) => sum + p.guests.length, 0) + col1Guests.length}
                      </h3>
                      <div className="space-y-0.5">
                        {col1Guests.map((guest) => (
                          <ScreenGuestRow key={guest.id} guest={guest} />
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Right Column */}
                <div className="space-y-1">
                  {col2Guests.length > 0 && (
                    <>
                      <h3 className="font-semibold text-xs text-muted-foreground mb-2 uppercase tracking-wide">
                        Guests {paginationInfo.pages.slice(0, currentPage - 1).reduce((sum, p) => sum + p.guests.length, 0) + col1Guests.length + 1}-{paginationInfo.pages.slice(0, currentPage - 1).reduce((sum, p) => sum + p.guests.length, 0) + currentGuests.length}
                      </h3>
                      <div className="space-y-0.5">
                        {col2Guests.map((guest) => (
                          <ScreenGuestRow key={guest.id} guest={guest} />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Footer Logo - Reserved space to prevent cut-off */}
              <div className="flex-shrink-0" style={{ minHeight: '15mm', marginTop: 'auto' }}>
                {settings.showLogo && (
                  <div className="flex justify-center pt-2">
                    <img 
                      src="/jpeg-2.jpg" 
                      alt="Wedding Waitress" 
                      style={{ height: '10.5mm', width: 'auto' }}
                      className="object-contain"
                    />
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>

        {/* Bottom Page Navigation */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>
            <div className="text-sm font-medium">
              Page {currentPage} of {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}
      </div>

      {/* Print Version - Multi-page with proper pagination */}
      <div id="full-seating-print-content" className="hidden print:block">
        {paginationInfo.pages.map((pageInfo, pageIndex) => (
          <div 
            key={pageIndex}
            className="print-page"
            style={{ pageBreakAfter: pageIndex < paginationInfo.pages.length - 1 ? 'always' : 'auto' }}
          >
            <div className="print-header">
              {/* Line 1: Event Name */}
              <h1 className="print-event-name">
                {event.name}
              </h1>
              
              {/* Line 2: Chart Type + Date */}
              <p className="print-chart-date">
                Full Seating Chart - {event.date && formatDateWithOrdinal(event.date)}
              </p>
              
              {/* Line 3: Venue + Stats + Page + Generated */}
              <p className="print-subtitle">
                {event.venue} - Total Guests: {guests.length} - Page {pageIndex + 1} of {paginationInfo.pages.length} - Generated on: {formatGeneratedTimestamp()}
              </p>
            </div>
            
            <div className="print-guest-list">
              <div className="print-guest-column">
                <div className="print-column-header">
                  GUESTS {pageInfo.startIndex + 1}-{pageInfo.startIndex + pageInfo.col1Count}
                </div>
                {pageInfo.guests.slice(0, pageInfo.col1Count).map((guest) => (
                  <PrintGuestRow key={guest.id} guest={guest} />
                ))}
              </div>
              <div className="print-guest-column">
                {pageInfo.guests.length > pageInfo.col1Count && (
                  <>
                    <div className="print-column-header">
                      GUESTS {pageInfo.startIndex + pageInfo.col1Count + 1}-{pageInfo.endIndex}
                    </div>
                    {pageInfo.guests.slice(pageInfo.col1Count).map((guest) => (
                      <PrintGuestRow key={guest.id} guest={guest} />
                    ))}
                  </>
                )}
              </div>
            </div>
            
            {/* Print Footer Logo */}
            {settings.showLogo && (
              <div className="print-footer">
                <img src="/wedding-waitress-print-footer.png?v=1" alt="Wedding Waitress" />
              </div>
            )}
            
          </div>
        ))}
      </div>
    </>
  );
};