import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Guest } from '@/hooks/useGuests';
import weddingWaitressLogo from '@/assets/wedding-waitress-logo-medium.png';

interface FullSeatingChartPreviewProps {
  event: any;
  guests: Guest[];
  sortBy: 'firstName' | 'lastName' | 'tableNo';
}

export const FullSeatingChartPreview: React.FC<FullSeatingChartPreviewProps> = ({
  event,
  guests,
  sortBy
}) => {
  const [checkedGuests, setCheckedGuests] = useState<Set<string>>(new Set());

  const formatGuestName = (guest: Guest) => {
    if (sortBy === 'lastName') {
      return `${guest.last_name || ''}, ${guest.first_name}`.trim();
    }
    return `${guest.first_name} ${guest.last_name || ''}`.trim();
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

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
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
        <div className="font-medium text-sm text-foreground">
          {formatGuestName(guest)}
        </div>
      </div>
      <div className="flex-shrink-0">
        <span className="text-xs px-2 py-1 bg-muted rounded">
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
      {/* Screen Version with A4 Preview */}
      <div className="space-y-6 print:hidden">
        {/* Interactive Version */}
        <Card>
          <CardContent className="p-6">
            {/* Header */}
            <div className="text-center mb-8 space-y-2">
              <h1 className="text-2xl font-bold text-primary">{event.name}</h1>
              <h2 className="text-lg font-semibold text-foreground">Full Seating Chart</h2>
              {event.date && (
                <p className="text-sm text-muted-foreground">{formatDate(event.date)}</p>
              )}
              {event.venue && (
                <p className="text-sm text-muted-foreground">{event.venue}</p>
              )}
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
            <div className="mt-8 pt-4 border-t text-center">
              <p className="text-sm text-muted-foreground">
                Total Guests: {guests.length} | 
                Checked: {checkedGuests.size} | 
                Remaining: {guests.length - checkedGuests.size}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Generated on {new Date().toLocaleDateString()}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* A4 Preview Container */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Print Preview (A4)</h3>
            <div className="flex justify-center">
              <div className="a4-preview border shadow-lg">
                <div className="print-preview-content">
                  <div className="print-header">
                    <h1>{event.name} - Full Seating Chart</h1>
                  </div>
                  <div className="print-guest-list">
                    {guests.map((guest) => (
                      <PrintGuestRow key={guest.id} guest={guest} />
                    ))}
                  </div>
                  <div className="print-footer">
                    <span>Total: {guests.length} guests</span>
                    <span>{new Date().toLocaleDateString()}</span>
                    <img src={weddingWaitressLogo} alt="Wedding Waitress" />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Print Version - Hidden until printing */}
      <div id="full-seating-print" className="hidden print:block">
        <style>{`
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
            padding: 12mm;
            height: 100%;
            display: flex;
            flex-direction: column;
          }
          
          .print-header {
            text-align: center;
            margin-bottom: 8mm;
          }
          
          .print-header h1 {
            font-size: 16px;
            font-weight: bold;
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
            font-size: 13px;
            line-height: 1.2;
            margin-bottom: 2px;
            color: #000;
          }
          
          .print-checkbox {
            font-family: monospace;
            font-size: 14px;
            margin-right: 4px;
          }
          
          .print-guest-name {
            font-weight: 500;
          }
          
          .print-separator {
            margin: 0 2px;
          }
          
          .print-table {
            font-weight: 400;
          }
          
          .print-footer {
            margin-top: auto;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 10px;
            color: #666;
            padding-top: 4mm;
            border-top: 1px solid #ddd;
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
              font-size: 12px !important;
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
            <h1>{event.name} - Full Seating Chart</h1>
          </div>
          <div className="print-guest-list">
            {guests.map((guest) => (
              <PrintGuestRow key={guest.id} guest={guest} />
            ))}
          </div>
          <div className="print-footer">
            <span>Total: {guests.length} guests</span>
            <span>{new Date().toLocaleDateString()}</span>
            <img src={weddingWaitressLogo} alt="Wedding Waitress" />
          </div>
        </div>
      </div>
    </>
  );
};