import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Guest } from '@/hooks/useGuests';
import weddingWaitressLogo from '@/assets/wedding-waitress-logo-medium.png';

interface FullSeatingChartPreviewProps {
  event: any;
  guests: Guest[];
}

export const FullSeatingChartPreview: React.FC<FullSeatingChartPreviewProps> = ({
  event,
  guests
}) => {
  const [checkedGuests, setCheckedGuests] = useState<Set<string>>(new Set());

  const handleGuestCheck = (guestId: string, checked: boolean) => {
    const newChecked = new Set(checkedGuests);
    if (checked) {
      newChecked.add(guestId);
    } else {
      newChecked.delete(guestId);
    }
    setCheckedGuests(newChecked);
  };

  // Split guests into two columns
  const midPoint = Math.ceil(guests.length / 2);
  const leftColumn = guests.slice(0, midPoint);
  const rightColumn = guests.slice(midPoint);

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

  const GuestRow = ({ guest, isInteractive = true }: { guest: Guest; isInteractive?: boolean }) => (
    <div className={`flex items-center gap-2 ${isInteractive ? 'py-2 px-1 hover:bg-muted/30 rounded-sm print:hover:bg-transparent' : 'print:py-0'}`}>
      <div className="flex-shrink-0">
        {isInteractive ? (
          <Checkbox
            id={`guest-${guest.id}`}
            checked={checkedGuests.has(guest.id)}
            onCheckedChange={(checked) => handleGuestCheck(guest.id, checked === true)}
            className="w-4 h-4"
          />
      ) : (
          <div className="w-3 h-3 border border-black rounded-sm print:w-3 print:h-3" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className={`font-medium ${isInteractive ? 'text-sm text-foreground' : ''} print:text-black print:text-xs`}>
          {guest.first_name} {guest.last_name || ''}
        </div>
      </div>
      <div className="flex-shrink-0">
        <span className={`${isInteractive ? 'text-xs px-2 py-1' : ''} print:text-xs font-medium print:text-black`}>
          {guest.table_no ? `Table ${guest.table_no}` : 'Unassigned'}
        </span>
      </div>
    </div>
  );

  return (
    <>
      {/* Screen Version */}
      <Card className="print:hidden">
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
                Guests {leftColumn.length > 0 ? `1-${leftColumn.length}` : ''}
              </h3>
              {leftColumn.map((guest) => (
                <GuestRow key={guest.id} guest={guest} />
              ))}
            </div>

            {/* Right Column */}
            <div className="space-y-1">
              <h3 className="font-semibold text-sm text-muted-foreground mb-3 uppercase tracking-wide">
                Guests {rightColumn.length > 0 ? `${leftColumn.length + 1}-${guests.length}` : ''}
              </h3>
              {rightColumn.map((guest) => (
                <GuestRow key={guest.id} guest={guest} />
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

      {/* Print Version */}
      <div className="hidden print:block print:min-h-screen">
        <style>{`
          @page {
            size: A4;
            margin: 5mm;
          }
          @media print {
            body { -webkit-print-color-adjust: exact; }
            * { box-sizing: border-box; }
            
            /* Hide all dashboard elements */
            .dashboard-sidebar,
            .stats-bar,
            .dashboard-header,
            .dashboard-nav,
            .action-buttons,
            .event-selector,
            .card:not(.print-guest-list),
            .dashboard-container > *:not(.print-guest-list) {
              display: none !important;
            }
            
            /* Hide the screen version completely */
            .print\\:hidden {
              display: none !important;
            }
            
            /* Show only print version */
            .print\\:block {
              display: block !important;
            }
            
            /* Full page layout */
            body, html, #root {
              margin: 0 !important;
              padding: 0 !important;
              height: 100vh !important;
              overflow: visible !important;
            }
            
            .print\\:full-height { 
              height: 100vh !important; 
              margin: 0 !important;
              padding: 0 !important;
            }
            .print\\:optimize-spacing { 
              line-height: 1.1 !important; 
            }
            
            /* Optimize text sizes for print */
            .print\\:text-xs { font-size: 10px !important; }
            .print\\:text-sm { font-size: 11px !important; }
            .print\\:text-base { font-size: 12px !important; }
            .print\\:text-lg { font-size: 14px !important; }
            
            /* Maximize space usage */
            .print\\:p-2 { padding: 8px !important; }
            .print\\:py-0 { padding-top: 0 !important; padding-bottom: 0 !important; }
            .print\\:mb-1 { margin-bottom: 4px !important; }
            .print\\:mb-2 { margin-bottom: 6px !important; }
            .print\\:space-y-0 > * + * { margin-top: 0 !important; }
          }
        `}</style>
        
        <div className="print:text-black print:text-sm print:full-height print:p-2 flex flex-col print:optimize-spacing">
          {/* Print Header - Minimal */}
          <div className="text-center print:mb-1">
            <h1 className="text-sm font-bold print:text-base print:mb-1">{event.name} - Full Seating Chart</h1>
          </div>

          {/* Print Two Column Layout - Fills remaining space */}
          <div className="print:grid print:grid-cols-2 print:gap-4 flex-1 print:optimize-spacing">
            {/* Print Left Column */}
            <div className="flex flex-col">
              <div className="print:space-y-0">
                {leftColumn.map((guest) => (
                  <GuestRow key={guest.id} guest={guest} isInteractive={false} />
                ))}
              </div>
            </div>

            {/* Print Right Column */}
            <div className="flex flex-col">
              <div className="print:space-y-0">
                {rightColumn.map((guest) => (
                  <GuestRow key={guest.id} guest={guest} isInteractive={false} />
                ))}
              </div>
            </div>
          </div>

          {/* Print Footer with Logo - Fixed at bottom */}
          <div className="print:mt-auto print:pt-2 print:text-center">
            <div className="flex justify-between items-center print:text-xs">
              <span>Total: {guests.length} guests</span>
              <span>{new Date().toLocaleDateString()}</span>
              <img 
                src={weddingWaitressLogo} 
                alt="Wedding Waitress" 
                className="w-16 h-auto opacity-60"
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};