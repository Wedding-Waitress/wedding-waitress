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
    <div className={`flex items-center gap-2 ${isInteractive ? 'py-2 px-1 hover:bg-muted/30 rounded-sm print:hover:bg-transparent' : 'py-1 print:py-0.5'}`}>
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
        <div className={`font-medium ${isInteractive ? 'text-sm text-foreground' : 'text-xs'} print:text-black print:text-sm`}>
          {guest.first_name} {guest.last_name || ''}
        </div>
      </div>
      <div className="flex-shrink-0">
        <span className={`${isInteractive ? 'text-xs px-2 py-1' : 'text-xs'} print:text-sm font-medium print:text-black`}>
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
            margin: 8mm 8mm 8mm 8mm;
          }
          @media print {
            body { -webkit-print-color-adjust: exact; }
            * { box-sizing: border-box; }
            .print\\:full-height { height: 100vh !important; }
            .print\\:optimize-spacing { line-height: 1.2 !important; }
          }
        `}</style>
        
        <div className="print:text-black print:text-sm print:full-height flex flex-col">
          {/* Print Header - Minimal */}
          <div className="text-center mb-2 print:mb-3">
            <h1 className="text-base font-bold print:text-lg">{event.name}</h1>
            <h2 className="text-sm font-semibold print:text-base">Full Seating Chart</h2>
            {event.date && (
              <p className="text-xs print:text-sm">{formatDate(event.date)}</p>
            )}
            {event.venue && (
              <p className="text-xs print:text-sm">{event.venue}</p>
            )}
          </div>

          {/* Print Two Column Layout - Fills remaining space */}
          <div className="print:grid print:grid-cols-2 print:gap-6 flex-1 print:optimize-spacing">
            {/* Print Left Column */}
            <div className="flex flex-col">
              <h3 className="font-semibold text-xs mb-1 uppercase tracking-wide border-b border-black pb-1 print:text-sm print:mb-2">
                Guests {leftColumn.length > 0 ? `1-${leftColumn.length}` : ''}
              </h3>
              <div className="space-y-0.5 print:space-y-1">
                {leftColumn.map((guest) => (
                  <GuestRow key={guest.id} guest={guest} isInteractive={false} />
                ))}
              </div>
            </div>

            {/* Print Right Column */}
            <div className="flex flex-col">
              <h3 className="font-semibold text-xs mb-1 uppercase tracking-wide border-b border-black pb-1 print:text-sm print:mb-2">
                Guests {rightColumn.length > 0 ? `${leftColumn.length + 1}-${guests.length}` : ''}
              </h3>
              <div className="space-y-0.5 print:space-y-1">
                {rightColumn.map((guest) => (
                  <GuestRow key={guest.id} guest={guest} isInteractive={false} />
                ))}
              </div>
            </div>
          </div>

          {/* Print Footer with Logo - Fixed at bottom */}
          <div className="print:mt-auto print:pt-3 print:border-t print:border-black print:text-center">
            <div className="flex flex-col items-center space-y-1">
              <div className="text-xs space-y-0.5 print:text-sm">
                <p>Total Guests: {guests.length}</p>
                <p>Generated on {new Date().toLocaleDateString()}</p>
              </div>
              <img 
                src={weddingWaitressLogo} 
                alt="Wedding Waitress Logo" 
                className="w-20 h-auto opacity-80 print:w-24"
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};