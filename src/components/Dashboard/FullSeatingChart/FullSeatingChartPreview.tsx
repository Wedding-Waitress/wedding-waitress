import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Guest } from '@/hooks/useGuests';
import { FullSeatingChartSettings } from '@/hooks/useFullSeatingChartSettings';
import { Badge } from '@/components/ui/badge';
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
        {settings.showRsvp && guest.rsvp && (
          <Badge variant={guest.rsvp === 'Accepted' ? 'default' : guest.rsvp === 'Declined' ? 'destructive' : 'secondary'} className="text-xs mt-1">
            {guest.rsvp}
          </Badge>
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

  // Get print font sizes based on settings
  const getPrintFontSizes = () => {
    switch (settings.fontSize) {
      case 'small': return { main: '12px', checkbox: '10px' };
      case 'large': return { main: '16px', checkbox: '13px' };
      default: return { main: '14px', checkbox: '11px' }; // medium
    }
  };

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
      {/* Screen Version */}
      <div className="print:hidden">
        {/* Interactive Version */}
        <Card>
          <CardContent className="p-6">
            {/* Header */}
            <div className="text-center mb-8 space-y-2">
              <h1 className="text-2xl font-bold text-primary">{event.name}</h1>
              <p className="text-base text-foreground">
                {event.date && formatDateWithOrdinal(event.date)}
                {event.date && event.venue && ' - '}
                {event.venue && event.venue}
                {(event.date || event.venue) && ' - '}
                Full Seating Chart
              </p>
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column */}
              <div className="space-y-1">
                <h3 className="font-semibold text-sm text-muted-foreground mb-3 uppercase tracking-wide">
                  Guests 1-{Math.ceil(guests.length / 2)}
                </h3>
                {guests.slice(0, Math.ceil(guests.length / 2)).map((guest) => (
                  <ScreenGuestRow key={guest.id} guest={guest} />
                ))}
              </div>

              {/* Right Column */}
              <div className="space-y-1">
                <h3 className="font-semibold text-sm text-muted-foreground mb-3 uppercase tracking-wide">
                  Guests {Math.ceil(guests.length / 2) + 1}-{guests.length}
                </h3>
                {guests.slice(Math.ceil(guests.length / 2)).map((guest) => (
                  <ScreenGuestRow key={guest.id} guest={guest} />
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="mt-8 pt-4 border-t text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Total Guests: {guests.length} - Generated on: {new Date().toLocaleDateString()}
              </p>
              <img src={weddingWaitressLogo} alt="Wedding Waitress" className="h-12 mx-auto opacity-60" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Print Version - Hidden until printing */}
      <div id="full-seating-print" className="hidden print:block">
        <style>{`
          /* Dynamic font sizes based on settings */
          :root {
            --print-main-font: ${getPrintFontSizes().main};
            --print-checkbox-font: ${getPrintFontSizes().checkbox};
          }
          @page {
            size: A4 portrait;
            margin: 12mm;
          }
          
          @media print {
            /* Hide everything except print version */
            body * {
              visibility: hidden;
            }
            
            .print-version, .print-version * {
              visibility: visible;
            }
            
            .print-version {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              height: 100%;
              background: white;
            }
            
            /* Hide all dashboard elements completely */
            .dashboard-sidebar,
            .stats-bar, 
            .dashboard-header,
            .dashboard-nav,
            .print\\:hidden,
            [class*="dashboard"],
            [class*="sidebar"],
            nav,
            header:not(.print-header),
            .card:not(.print-version *) {
              display: none !important;
              visibility: hidden !important;
            }
          }
          
          /* A4 Preview Styles */
          .a4-preview {
            width: 210mm;
            height: 297mm;
            background: #fff;
            overflow: hidden;
            transform: scale(0.6);
            transform-origin: top left;
          }
          
          .print-preview-content {
            padding: 6mm 12mm 6mm 12mm;
            height: 100%;
            display: flex;
            flex-direction: column;
          }
          
          .print-header {
            text-align: center;
            margin-bottom: 4mm;
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
            column-fill: balance;
          }
          
          .print-guest-item {
            break-inside: avoid;
            font-size: var(--print-main-font);
            line-height: 1.2;
            margin-bottom: 2px;
            color: #000;
          }
          
          .print-checkbox {
            font-family: monospace;
            font-size: var(--print-checkbox-font);
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
            margin-top: auto;
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            font-size: 10px;
            color: #666;
            padding-top: 2mm;
            border-top: 1px solid #ddd;
            gap: 1mm;
          }
          
          .print-footer-stats {
            font-size: 10px;
            color: #666;
          }
          
          .print-footer img {
            height: 12mm;
            opacity: 0.6;
          }
          
          /* Print-specific styles */
          @media print {
            body * {
              visibility: hidden;
            }
            
            #full-seating-print,
            #full-seating-print * {
              visibility: visible !important;
            }
            
            #full-seating-print {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              background: white !important;
              display: block !important;
            }
            
            .print-preview-content {
              transform: none !important;
              padding: 0 !important;
              height: 100vh !important;
            }
            
            .print-guest-list {
              font-size: var(--print-main-font) !important;
              line-height: 1.1 !important;
            }
            
            .print-guest-item {
              margin-bottom: 1px !important;
            }
            
            .print-footer {
              position: fixed;
              bottom: 0;
              left: 0;
              right: 0;
              background: white;
            }
          }
        `}</style>
        
        <div className="print-preview-content">
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
            {guests.map((guest) => (
              <PrintGuestRow key={guest.id} guest={guest} />
            ))}
          </div>
          <div className="print-footer">
            <div className="print-footer-stats">
              Total Guests: {guests.length} - Generated on: {new Date().toLocaleDateString()}
            </div>
            <img src={weddingWaitressLogo} alt="Wedding Waitress" />
          </div>
        </div>
      </div>
    </>
  );
};