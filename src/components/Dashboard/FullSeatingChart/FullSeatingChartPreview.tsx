import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Guest } from '@/hooks/useGuests';
import { FullSeatingChartSettings } from '@/hooks/useFullSeatingChartSettings';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import weddingWaitressLogo from '@/assets/wedding-waitress-new-logo.png';

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

  // Calculate pagination based on A4 pixel dimensions (794px × 1123px at 96 DPI)
  const paginationInfo = useMemo(() => {
    // A4 dimensions at 96 DPI
    const A4_WIDTH = 794; // px
    const A4_HEIGHT = 1123; // px
    const MARGIN = 45; // 12mm ≈ 45px
    
    // Available content area after margins
    const contentWidth = A4_WIDTH - (MARGIN * 2); // 704px
    const contentHeight = A4_HEIGHT - (MARGIN * 2); // 1033px
    
    // Reserve space for header and footer
    const headerHeight = 100; // px
    const footerHeight = 120; // px
    const guestListHeight = contentHeight - headerHeight - footerHeight; // 813px
    
    // Calculate pixel height per guest based on font size and displayed info
    const fontSizeMap = {
      small: { lineHeight: 20, extraLine: 18 },    // 10.5pt ≈ 14px + padding
      medium: { lineHeight: 24, extraLine: 20 },   // 12pt ≈ 16px + padding
      large: { lineHeight: 28, extraLine: 24 }     // 13.5pt ≈ 18px + padding
    };
    
    const currentFont = fontSizeMap[settings.fontSize];
    let pixelsPerGuest = currentFont.lineHeight; // Base: name line
    if (settings.showDietary) pixelsPerGuest += currentFont.extraLine;
    if (settings.showRsvp) pixelsPerGuest += currentFont.extraLine;
    if (settings.showRelation) pixelsPerGuest += currentFont.extraLine;
    
    // Calculate guests per column
    const guestsPerColumn = Math.floor(guestListHeight / pixelsPerGuest);
    const maxGuestsPerPage = guestsPerColumn * 2; // Two columns
    
    // Split guests into pages
    const pages: Guest[][] = [];
    for (let i = 0; i < guests.length; i += maxGuestsPerPage) {
      pages.push(guests.slice(i, i + maxGuestsPerPage));
    }

    return { pages, maxGuestsPerPage, guestsPerColumn };
  }, [guests, settings.fontSize, settings.showDietary, settings.showRsvp, settings.showRelation]);

  const totalPages = paginationInfo.pages.length;
  const currentGuests = paginationInfo.pages[currentPage - 1] || [];

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
          body {
            margin: 0;
            padding: 0;
          }
          
          .print-page {
            position: relative;
            min-height: 273mm; /* A4 height (297mm) - margins (12mm × 2) */
            display: flex;
            flex-direction: column;
          }
          
          .print-header {
            text-align: center;
            margin-bottom: 6mm;
          }
          
          .print-event-name {
            font-size: 18px;
            font-weight: bold;
            margin: 0 0 4px 0;
            color: #8B5CF6;
          }
          
          .print-subtitle {
            font-size: 14px;
            margin: 0;
            color: #000;
          }
          
          .print-guest-list {
            flex: 1;
            columns: 2;
            column-gap: 12mm;
            column-fill: auto;
            max-height: 229mm; /* Reserve space for header (30mm) and footer (38mm) */
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
          
          .print-footer {
            margin-top: 4mm;
            padding-top: 4mm;
            border-top: 1px solid #ddd;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 2mm;
          }
          
          .print-footer-stats {
            font-size: 10px;
            color: #666;
          }
          
          .print-footer img {
            height: 12mm;
            opacity: 0.6;
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
            className="bg-background border border-border shadow-lg overflow-auto"
            style={{ 
              width: '794px', 
              height: '1123px',
              maxWidth: '100%'
            }}
          >
            {/* Content with 12mm margins (45px) */}
            <div className="p-[45px] h-full flex flex-col">
              {/* Header - 100px reserved */}
              <div className="text-center mb-4" style={{ minHeight: '100px' }}>
                <h1 className="text-2xl font-bold text-primary mb-2">{event.name}</h1>
                <p className="text-base text-foreground">
                  {event.date && formatDateWithOrdinal(event.date)}
                  {event.date && event.venue && ' - '}
                  {event.venue && event.venue}
                  {(event.date || event.venue) && ' - '}
                  Full Seating Chart
                </p>
              </div>

              {/* Guest List - 813px available */}
              <div className="flex-1 grid grid-cols-2 gap-8" style={{ minHeight: '813px' }}>
                {/* Left Column */}
                <div className="space-y-1">
                  <h3 className="font-semibold text-xs text-muted-foreground mb-3 uppercase tracking-wide">
                    Guests {((currentPage - 1) * paginationInfo.maxGuestsPerPage) + 1}-{((currentPage - 1) * paginationInfo.maxGuestsPerPage) + Math.ceil(currentGuests.length / 2)}
                  </h3>
                  <div className="space-y-0.5">
                    {currentGuests.slice(0, Math.ceil(currentGuests.length / 2)).map((guest) => (
                      <ScreenGuestRow key={guest.id} guest={guest} />
                    ))}
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-1">
                  <h3 className="font-semibold text-xs text-muted-foreground mb-3 uppercase tracking-wide">
                    Guests {((currentPage - 1) * paginationInfo.maxGuestsPerPage) + Math.ceil(currentGuests.length / 2) + 1}-{((currentPage - 1) * paginationInfo.maxGuestsPerPage) + currentGuests.length}
                  </h3>
                  <div className="space-y-0.5">
                    {currentGuests.slice(Math.ceil(currentGuests.length / 2)).map((guest) => (
                      <ScreenGuestRow key={guest.id} guest={guest} />
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer - 120px reserved */}
              <div className="mt-auto pt-4 border-t text-center space-y-2" style={{ minHeight: '120px' }}>
                <p className="text-sm text-muted-foreground">
                  Total Guests: {guests.length} - Page {currentPage} of {totalPages} - Generated on: {new Date().toLocaleDateString()}
                </p>
                <img src={weddingWaitressLogo} alt="Wedding Waitress" className="h-12 mx-auto opacity-60" />
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
        {paginationInfo.pages.map((pageGuests, pageIndex) => (
          <div 
            key={pageIndex}
            className="print-page"
            style={{ pageBreakAfter: pageIndex < paginationInfo.pages.length - 1 ? 'always' : 'auto' }}
          >
            <div className="print-header">
              <h1 className="print-event-name">{event.name}</h1>
              <p className="print-subtitle">
                {event.date && formatDateWithOrdinal(event.date)}
                {event.date && event.venue && ' - '}
                {event.venue && event.venue}
                {(event.date || event.venue) && ' - '}
                Full Seating Chart
              </p>
            </div>
            
            <div className="print-guest-list">
              {pageGuests.map((guest) => (
                <PrintGuestRow key={guest.id} guest={guest} />
              ))}
            </div>
            
            <div className="print-footer">
              <p className="print-footer-stats">
                Total Guests: {guests.length} - Page {pageIndex + 1} of {paginationInfo.pages.length} - Generated on: {new Date().toLocaleDateString()}
              </p>
              <img src={weddingWaitressLogo} alt="Wedding Waitress" />
            </div>
          </div>
        ))}
      </div>
    </>
  );
};