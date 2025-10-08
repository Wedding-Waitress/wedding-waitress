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
}

export const FullSeatingChartPreview: React.FC<FullSeatingChartPreviewProps> = ({
  event,
  guests,
  settings
}) => {
  const [checkedGuests, setCheckedGuests] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);

  // Content-aware pagination based on actual guest content
  const paginationInfo = useMemo(() => {
    // A4 dimensions at 96 DPI
    const A4_HEIGHT = 1123; // px
    const MARGIN = 45; // 12mm ≈ 45px
    const contentHeight = A4_HEIGHT - (MARGIN * 2); // 1033px
    const headerHeight = 120; // px
    const guestListHeight = contentHeight - headerHeight; // 913px
    const COL_HEADER_PX = 34; // Height of "Guests X-Y" header per column
    
    // Accurate row metrics per font size
    const metrics = {
      small: { base: 28, extra: 14, spacing: 2 },
      medium: { base: 30, extra: 16, spacing: 2 },
      large: { base: 32, extra: 18, spacing: 2 },
    };
    
    const currentMetrics = metrics[settings.fontSize];
    
    // Calculate exact height for each guest
    const guestRowHeight = (guest: Guest): number => {
      let h = currentMetrics.base;
      if (settings.showDietary && guest.dietary && guest.dietary !== 'NA') {
        h += currentMetrics.extra;
      }
      if (settings.showRelation && guest.relation_display) {
        h += currentMetrics.extra;
      }
      return h + currentMetrics.spacing;
    };
    
    const SAFETY_BUFFER = 70; // Reserve blank space at bottom of page (~70px ≈ 18mm)
    const availablePerColumn = guestListHeight - COL_HEADER_PX - SAFETY_BUFFER;
    
    // Build pages by filling columns to available height
    interface PageInfo {
      guests: Guest[];
      col1Count: number;
    }
    
    const pages: PageInfo[] = [];
    let currentIndex = 0;
    
    while (currentIndex < guests.length) {
      let col1Height = 0;
      let col1Count = 0;
      
      // Fill column 1
      while (currentIndex + col1Count < guests.length) {
        const guest = guests[currentIndex + col1Count];
        const rowHeight = guestRowHeight(guest);
        
        if (col1Height + rowHeight > availablePerColumn) break;
        
        col1Height += rowHeight;
        col1Count++;
      }
      
      let col2Height = 0;
      let col2Count = 0;
      
      // Fill column 2
      while (currentIndex + col1Count + col2Count < guests.length) {
        const guest = guests[currentIndex + col1Count + col2Count];
        const rowHeight = guestRowHeight(guest);
        
        if (col2Height + rowHeight > availablePerColumn) break;
        
        col2Height += rowHeight;
        col2Count++;
      }
      
      const totalCount = col1Count + col2Count;
      if (totalCount === 0) break; // Safety: prevent infinite loop
      
      pages.push({
        guests: guests.slice(currentIndex, currentIndex + totalCount),
        col1Count
      });
      
      currentIndex += totalCount;
    }
    
    return { pages };
  }, [guests, settings.fontSize, settings.showDietary, settings.showRelation]);

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

  // Screen version guest row
  const ScreenGuestRow = ({ guest }: { guest: Guest }) => (
    <div className="flex items-center gap-3 py-2 px-1 hover:bg-muted/30 rounded-sm">
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

  // Print version guest row - exactly as specified: [ ] {first_name} {last_name} — Table {table_number | Unassigned}
  const PrintGuestRow = ({ guest }: { guest: Guest }) => (
    <div className="print-guest-item">
      <span className="print-checkbox">☐</span>
      <span className="print-guest-name">{formatGuestName(guest)}</span>
      <span className="print-separator"> — </span>
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
          margin: 12mm;
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
            min-height: 273mm; /* A4 height (297mm) - margins (12mm × 2) */
            display: flex;
            flex-direction: column;
            background-color: white !important;
          }
          
        .print-header {
          text-align: center;
          margin-bottom: 6mm;
        }

        .print-logo {
          display: flex;
          justify-content: center;
          margin-bottom: 8px;
        }

        .print-logo img {
          height: 48px;
          width: auto;
          object-fit: contain;
        }

        .print-event-name {
          font-size: 20px;
          font-weight: bold;
          margin: 0 0 4px 0;
          color: #8B5CF6;
        }

        .print-chart-date {
          font-size: 15px;
          font-weight: 600;
          margin: 0 0 4px 0;
          color: #000;
        }
          
          .print-subtitle {
            font-size: 13px;
            margin: 0;
            color: #000;
          }
          
          .print-guest-list {
            flex: 1;
            columns: 2;
            column-gap: 12mm;
            column-fill: auto;
            max-height: 252mm; /* Reserve space for compact header (21mm) only */
          }
          
          .print-guest-item {
            break-inside: avoid;
            font-size: ${printFontSizes.main};
            line-height: 1.2;
            margin-bottom: 2px;
            color: #000;
          }
          
          .print-checkbox {
            font-family: monospace;
            font-size: ${printFontSizes.checkbox};
            margin-right: 4px;
          }
          
          .print-guest-name {
            font-weight: 700;
          }
          
          .print-separator {
            margin: 0 2px;
          }
          
          .print-table {
            font-weight: 700;
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

        {/* A4 Paper Container - 794px × 1123px (210mm × 297mm at 96 DPI) */}
        <div className="flex justify-center">
          <div 
            className="bg-white border border-gray-300 shadow-lg overflow-auto"
            style={{ 
              width: '794px', 
              height: '1123px',
              maxWidth: '100%'
            }}
          >
            {/* Content with 12mm margins (45px) */}
            <div className="p-[45px] h-full flex flex-col">
              {/* Header - 120px reserved */}
              <div className="text-center mb-6" style={{ minHeight: '120px' }}>
                {/* Logo */}
                <div className="flex justify-center mb-3">
                  <img 
                    src={weddingWaitressLogoFull} 
                    alt="Wedding Waitress" 
                    className="h-12 w-auto object-contain"
                  />
                </div>
                
                {/* Line 1: Event Name */}
                <h1 className="text-xl font-bold text-primary mb-1">
                  {event.name}
                </h1>
                
                {/* Line 2: Chart Type + Date */}
                <p className="text-base font-semibold text-foreground mb-1">
                  Full Seating Chart - {event.date && formatDateWithOrdinal(event.date)}
                </p>
                
                {/* Line 3: Venue + Stats + Page + Generated */}
                <p className="text-sm text-foreground">
                  {event.venue} - Total Guests: {guests.length} - Page {currentPage} of {totalPages} - Generated on: {new Date().toLocaleDateString('en-GB')}
                </p>
              </div>

              {/* Guest List - 913px available */}
              <div className="flex-1 grid grid-cols-2 gap-8" style={{ minHeight: '913px' }}>
                {/* Left Column */}
                <div className="space-y-1">
                  {col1Guests.length > 0 && (
                    <>
                      <h3 className="font-semibold text-xs text-muted-foreground mb-3 uppercase tracking-wide">
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
                      <h3 className="font-semibold text-xs text-muted-foreground mb-3 uppercase tracking-wide">
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
              {/* Logo - print version */}
              <div className="print-logo">
                <img src={weddingWaitressLogoFull} alt="Wedding Waitress" />
              </div>
              
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
                {event.venue} - Total Guests: {guests.length} - Page {pageIndex + 1} of {paginationInfo.pages.length} - Generated on: {new Date().toLocaleDateString('en-GB')}
              </p>
            </div>
            
            <div className="print-guest-list">
              {pageInfo.guests.map((guest) => (
                <PrintGuestRow key={guest.id} guest={guest} />
              ))}
            </div>
            
          </div>
        ))}
      </div>
    </>
  );
};