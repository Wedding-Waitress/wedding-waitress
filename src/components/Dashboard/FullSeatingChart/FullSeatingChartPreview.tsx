import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Guest } from '@/hooks/useGuests';

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
    <div className="flex items-center gap-3 py-2 px-1 hover:bg-muted/30 rounded-sm print:hover:bg-transparent">
      <div className="flex-shrink-0">
        {isInteractive ? (
          <Checkbox
            id={`guest-${guest.id}`}
            checked={checkedGuests.has(guest.id)}
            onCheckedChange={(checked) => handleGuestCheck(guest.id, checked === true)}
            className="w-4 h-4"
          />
        ) : (
          <div className="w-4 h-4 border border-foreground/30 rounded-sm print:border-black" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm text-foreground print:text-black">
          {guest.first_name} {guest.last_name || ''}
        </div>
      </div>
      <div className="flex-shrink-0">
        <Badge 
          variant="outline" 
          className="text-xs px-2 py-1 print:border-black print:text-black"
        >
          {guest.table_no ? `Table ${guest.table_no}` : 'Unassigned'}
        </Badge>
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
      <div className="hidden print:block print:w-full print:h-full">
        <div className="print:p-8 print:text-black">
          {/* Print Header */}
          <div className="text-center mb-6 space-y-1">
            <h1 className="text-xl font-bold">{event.name}</h1>
            <h2 className="text-lg font-semibold">Full Seating Chart</h2>
            {event.date && (
              <p className="text-sm">{formatDate(event.date)}</p>
            )}
            {event.venue && (
              <p className="text-sm">{event.venue}</p>
            )}
          </div>

          {/* Print Two Column Layout */}
          <div className="print:grid print:grid-cols-2 print:gap-6">
            {/* Print Left Column */}
            <div>
              <h3 className="font-semibold text-sm mb-2 uppercase tracking-wide border-b border-black pb-1">
                Guests {leftColumn.length > 0 ? `1-${leftColumn.length}` : ''}
              </h3>
              {leftColumn.map((guest) => (
                <GuestRow key={guest.id} guest={guest} isInteractive={false} />
              ))}
            </div>

            {/* Print Right Column */}
            <div>
              <h3 className="font-semibold text-sm mb-2 uppercase tracking-wide border-b border-black pb-1">
                Guests {rightColumn.length > 0 ? `${leftColumn.length + 1}-${guests.length}` : ''}
              </h3>
              {rightColumn.map((guest) => (
                <GuestRow key={guest.id} guest={guest} isInteractive={false} />
              ))}
            </div>
          </div>

          {/* Print Footer */}
          <div className="print:mt-6 print:pt-2 print:border-t print:border-black print:text-center">
            <p className="text-sm">
              Total Guests: {guests.length}
            </p>
            <p className="text-xs mt-1">
              Generated on {new Date().toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
    </>
  );
};