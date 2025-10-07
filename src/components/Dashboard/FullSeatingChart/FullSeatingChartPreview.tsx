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
        
        #full-seating-print-content {
          display: none;
        }
        
        @media print {
          /* Hide all non-print content */
          body > *:not(#full-seating-print-content) {
            display: none !important;
          }
          
          /* Show only print content */
          #full-seating-print-content {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          body {
            margin: 0;
            padding: 0;
            background: white;
          }
        }
        
        .print-preview-content {
          padding: 0;
          display: flex;
          flex-direction: column;
          min-height: 100vh;
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
          column-fill: balance;
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
          margin-top: auto;
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
      `}</style>

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
      <div id="full-seating-print-content">
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